// DocumentReviewHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Grammarly-style document review — inline suggestions with CFR alignment scoring

import type { AIRequest, AIResponse, ScoreResult, ScoreCategory, DocumentSuggestion, ScoreCategoryName } from '@vetassist/shared-types';
import { MODELS } from '@vetassist/shared-config';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';

interface DocumentReviewDeps {
  readonly provider: AIProvider;
  readonly promptLoader: PromptLoader;
}

// Shape of the raw JSON we expect Claude to return
interface RawScoreJson {
  overall: number;
  mode: 'encouraging' | 'strict';
  categories: Array<{
    name: string;
    score: number;
    feedback: string;
  }>;
  suggestions: Array<{
    id: string;
    priority: string;
    text: string;
    cfrCitation: string | null;
  }>;
}

// Valid category names — used to guard incoming AI output
const VALID_CATEGORY_NAMES: ReadonlySet<ScoreCategoryName> = new Set([
  'Specificity',
  'Completeness',
  'VA_Alignment',
  'PII_Safety',
]);

// Valid priority values for suggestions
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);

function buildScoringInstruction(scoringMode: 'encouraging' | 'strict'): string {
  const modeDescription = scoringMode === 'strict'
    ? 'Rate exactly as a VA reviewer would — no sugar-coating. Honest, direct feedback only.'
    : 'Use supportive, encouraging language. Highlight improvements needed with positive framing.';

  return `
Review the following veteran document and return a JSON object with exactly this structure:
{
  "overall": 0-100,
  "mode": "${scoringMode}",
  "categories": [
    { "name": "Specificity", "score": 0-100, "feedback": "string" },
    { "name": "Completeness", "score": 0-100, "feedback": "string" },
    { "name": "VA_Alignment", "score": 0-100, "feedback": "string" },
    { "name": "PII_Safety", "score": 0-100, "feedback": "string" }
  ],
  "suggestions": [
    { "id": "uuid", "priority": "high|medium|low", "text": "suggestion text", "cfrCitation": "38 CFR § X.X or null" }
  ]
}
Scoring mode: ${modeDescription}
Return ONLY the JSON. No markdown, no explanation.
`;
}

function buildFallbackScoreResult(scoringMode: 'encouraging' | 'strict'): ScoreResult {
  return {
    overall: 0,
    mode: scoringMode,
    categories: [],
    suggestions: [],
  };
}

function parseScoreResult(raw: RawScoreJson): ScoreResult {
  const categories: readonly ScoreCategory[] = raw.categories
    .filter((c) => VALID_CATEGORY_NAMES.has(c.name as ScoreCategoryName))
    .map((c) => ({
      name: c.name as ScoreCategoryName,
      score: c.score,
      feedback: c.feedback,
    }));

  const suggestions: readonly DocumentSuggestion[] = raw.suggestions
    .filter((s) => VALID_PRIORITIES.has(s.priority))
    .map((s) => ({
      id: s.id,
      priority: s.priority as 'high' | 'medium' | 'low',
      text: s.text,
      cfrCitation: s.cfrCitation ?? null,
    }));

  return {
    overall: raw.overall,
    mode: raw.mode,
    categories,
    suggestions,
  };
}

async function review(
  sessionId: string,
  documentText: string,
  scoringMode: 'encouraging' | 'strict',
  deps: DocumentReviewDeps,
): Promise<ScoreResult> {
  const skillPrompt = await deps.promptLoader.load('document_reviewer');
  const scoringInstruction = buildScoringInstruction(scoringMode);
  const systemPrompt = `${skillPrompt}\n\n${scoringInstruction}`;

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
    const parsed = JSON.parse(rawResponse.text) as RawScoreJson;
    return parseScoreResult(parsed);
  } catch {
    // If Claude returns malformed JSON, return a zero-score fallback so callers never get null
    return buildFallbackScoreResult(scoringMode);
  }
}

export const DocumentReviewHandler = { review } as const;
