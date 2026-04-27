// InlineDiffHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Produces per-span inline diff suggestions for Grammarly-style accept/reject review

import { randomUUID } from 'crypto';
import type {
  AIRequest,
  AIResponse,
  InlineDiff,
  InlineReviewResult,
  ScoreCategory,
  ScoreCategoryName,
  DiffRiskLevel,
} from '@vetassist/shared-types';
import { MODELS } from '@vetassist/shared-config';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';

interface InlineDiffDeps {
  readonly provider: AIProvider;
  readonly promptLoader: PromptLoader;
}

// Raw JSON shape we instruct Claude to return
interface RawDiff {
  originalText: string | null;
  suggestedText: string | null;
  rationale: string;
  priority: string;
  riskLevel: string;
  category: string;
  cfrCitation: string | null;
}

interface RawInlineReview {
  overall: number;
  mode: 'encouraging' | 'strict';
  categories: Array<{ name: string; score: number; feedback: string }>;
  diffs: RawDiff[];
}

const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);
const VALID_RISK_LEVELS: ReadonlySet<DiffRiskLevel> = new Set(['safe', 'moderate', 'needs_review']);
const VALID_CATEGORIES = new Set(['grammar', 'specificity', 'completeness', 'va_alignment', 'pii']);
const VALID_SCORE_NAMES: ReadonlySet<ScoreCategoryName> = new Set([
  'Specificity', 'Completeness', 'VA_Alignment', 'PII_Safety',
]);

// Builds the structured prompt that tells Claude exactly what JSON schema to return
function buildInlineDiffInstruction(
  documentText: string,
  scoringMode: 'encouraging' | 'strict',
): string {
  const modeNote = scoringMode === 'strict'
    ? 'Rate exactly as a VA reviewer would — no sugar-coating.'
    : 'Use supportive language. Score generously. Focus on the most impactful changes.';

  return `
You are performing a Grammarly-style review of a veteran's VA document.

Scoring mode: ${modeNote}

Return ONLY a JSON object with this exact structure — no markdown, no explanation:
{
  "overall": <0-100>,
  "mode": "${scoringMode}",
  "categories": [
    { "name": "Specificity", "score": <0-100>, "feedback": "<1-sentence>" },
    { "name": "Completeness", "score": <0-100>, "feedback": "<1-sentence>" },
    { "name": "VA_Alignment", "score": <0-100>, "feedback": "<1-sentence>" },
    { "name": "PII_Safety", "score": <0-100>, "feedback": "<1-sentence>" }
  ],
  "diffs": [
    {
      "originalText": "<exact verbatim span from the document, or null for insertion>",
      "suggestedText": "<replacement text, or null for deletion>",
      "rationale": "<one sentence: WHY this change improves the document>",
      "priority": "high|medium|low",
      "riskLevel": "safe|moderate|needs_review",
      "category": "grammar|specificity|completeness|va_alignment|pii",
      "cfrCitation": "38 CFR § X.X or null"
    }
  ]
}

Rules for diffs:
- originalText MUST be a verbatim substring of the document (copy exactly, including punctuation)
- Do NOT invent facts — only suggest clearer wording for facts the veteran stated
- riskLevel "needs_review" = changes substantive meaning — flag these for extra veteran attention
- Limit to the 10 highest-impact diffs maximum
- If no changes needed, return an empty diffs array

Document to review:
---
${documentText}
---
`;
}

// Locates the char offset of a substring in the document text — O(n) linear scan
function findSpan(
  documentText: string,
  originalText: string,
): { startOffset: number; endOffset: number } {
  const idx = documentText.indexOf(originalText);
  if (idx === -1) return { startOffset: 0, endOffset: 0 };
  return { startOffset: idx, endOffset: idx + originalText.length };
}

function parseDiff(raw: RawDiff, documentText: string): InlineDiff {
  const priority = VALID_PRIORITIES.has(raw.priority) ? raw.priority as 'high' | 'medium' | 'low' : 'low';
  const riskLevel = VALID_RISK_LEVELS.has(raw.riskLevel as DiffRiskLevel) ? raw.riskLevel as DiffRiskLevel : 'safe';
  const category = VALID_CATEGORIES.has(raw.category)
    ? raw.category as InlineDiff['category']
    : 'grammar';

  const span = raw.originalText
    ? findSpan(documentText, raw.originalText)
    : { startOffset: 0, endOffset: 0 };

  return {
    id: randomUUID(),
    priority,
    riskLevel,
    category,
    originalText: raw.originalText ?? null,
    suggestedText: raw.suggestedText ?? null,
    rationale: raw.rationale ?? '',
    cfrCitation: raw.cfrCitation ?? null,
    startOffset: span.startOffset,
    endOffset: span.endOffset,
  };
}

function parseCategories(raw: RawInlineReview['categories']): readonly ScoreCategory[] {
  return raw
    .filter((c) => VALID_SCORE_NAMES.has(c.name as ScoreCategoryName))
    .map((c) => ({
      name: c.name as ScoreCategoryName,
      score: c.score,
      feedback: c.feedback,
    }));
}

function buildFallback(
  sessionId: string,
  scoringMode: 'encouraging' | 'strict',
): InlineReviewResult {
  return {
    sessionId,
    overall: 0,
    mode: scoringMode,
    categories: [],
    diffs: [],
  };
}

async function review(
  sessionId: string,
  documentText: string,
  scoringMode: 'encouraging' | 'strict',
  deps: InlineDiffDeps,
): Promise<InlineReviewResult> {
  const skillPrompt = await deps.promptLoader.load('document_reviewer');
  const diffInstruction = buildInlineDiffInstruction(documentText, scoringMode);
  const systemPrompt = `${skillPrompt}\n\n${diffInstruction}`;

  const request: AIRequest = {
    sessionId,
    sanitizedText: documentText,
    contextChunks: [systemPrompt],
    skillId: 'document_reviewer',
    model: MODELS.reasoning,
    timestamp: new Date().toISOString(),
  };

  const rawResponse: AIResponse = await deps.provider.complete(request);

  try {
    const parsed = JSON.parse(rawResponse.text) as RawInlineReview;
    const diffs = (parsed.diffs ?? []).map((d) => parseDiff(d, documentText));
    const categories = parseCategories(parsed.categories ?? []);

    return {
      sessionId,
      overall: parsed.overall ?? 0,
      mode: parsed.mode ?? scoringMode,
      categories,
      diffs,
    };
  } catch {
    // Malformed JSON from AI — return safe fallback so the UI never breaks
    return buildFallback(sessionId, scoringMode);
  }
}

export const InlineDiffHandler = { review } as const;
