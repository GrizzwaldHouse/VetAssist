// DecisionLetterHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: VA Decision Letter analyzer — converts bureaucratic legalese to plain English

import type {
  AIRequest,
  AIResponse,
  DecisionLetterAnalysis,
  ConditionDecision,
  EvidenceAnalysis,
  AppealOption,
  RatingCalculation,
} from '@vetassist/shared-types';
import { MODELS } from '@vetassist/shared-config';
import { ComplianceEngine } from '@vetassist/compliance';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';

interface DecisionLetterHandlerDeps {
  readonly provider: AIProvider;
  readonly promptLoader: PromptLoader;
}

// Standard appeal options derived from 38 CFR — same for every decision letter
const STANDARD_APPEAL_OPTIONS: readonly AppealOption[] = [
  {
    name: 'Supplemental Claim',
    deadline: '1 year from decision',
    description: 'Submit new and relevant evidence',
    cfrCitation: '38 CFR § 19.5',
  },
  {
    name: 'Higher-Level Review',
    deadline: '1 year from decision',
    description: 'Request senior reviewer with no new evidence',
    cfrCitation: '38 CFR § 19.5',
  },
  {
    name: 'Board Appeal',
    deadline: '1 year from decision',
    description: 'Appeal to the Board of Veterans Appeals',
    cfrCitation: '38 CFR § 20.201',
  },
];

// Instruction injected after the skill prompt to constrain the response to pure JSON
const JSON_ANALYSIS_INSTRUCTION = `
Analyze the following VA decision letter. Return a JSON object with exactly this structure:
{
  "summary": "string — 2-3 sentences summarizing all decisions",
  "conditions": [
    {
      "condition": "condition name",
      "decision": "granted|denied|deferred",
      "ratingPercent": number or null,
      "effectiveDate": "date string or null",
      "reasoningPlainEnglish": "plain English explanation",
      "evidenceCited": ["list of evidence VA cited"],
      "evidenceMissing": ["list of evidence that could strengthen the claim"]
    }
  ],
  "evidenceAnalysis": {
    "cited": ["evidence VA mentioned"],
    "missing": ["evidence that should be added"],
    "recommendations": ["specific recommendations"]
  },
  "appealOptions": [
    { "name": "Supplemental Claim", "deadline": "1 year from decision", "description": "Submit new and relevant evidence", "cfrCitation": "38 CFR § 19.5" },
    { "name": "Higher-Level Review", "deadline": "1 year from decision", "description": "Request senior reviewer with no new evidence", "cfrCitation": "38 CFR § 19.5" },
    { "name": "Board Appeal", "deadline": "1 year from decision", "description": "Appeal to the Board of Veterans Appeals", "cfrCitation": "38 CFR § 20.201" }
  ],
  "combinedRating": {
    "conditions": [{"name": "string", "percent": number}],
    "combinedPercent": number,
    "calculationSteps": "Step-by-step VA math explanation using the whole-person method"
  }
}
Return ONLY the JSON. No markdown, no explanation.
`;

// Shape of the raw JSON we expect Claude to return
interface RawAnalysisJson {
  summary: string;
  conditions: Array<{
    condition: string;
    decision: string;
    ratingPercent: number | null;
    effectiveDate: string | null;
    reasoningPlainEnglish: string;
    evidenceCited: string[];
    evidenceMissing: string[];
  }>;
  evidenceAnalysis: {
    cited: string[];
    missing: string[];
    recommendations: string[];
  };
  appealOptions: Array<{
    name: string;
    deadline: string;
    description: string;
    cfrCitation: string;
  }>;
  combinedRating: {
    conditions: Array<{ name: string; percent: number }>;
    combinedPercent: number;
    calculationSteps: string;
  };
}

function buildFallbackAnalysis(sessionId: string, rawText: string): DecisionLetterAnalysis {
  return {
    sessionId,
    summary: rawText,
    conditions: [],
    evidenceAnalysis: { cited: [], missing: [], recommendations: [] },
    appealOptions: STANDARD_APPEAL_OPTIONS,
    combinedRating: { conditions: [], combinedPercent: 0, calculationSteps: '' },
  };
}

function parseAnalysis(sessionId: string, raw: RawAnalysisJson): DecisionLetterAnalysis {
  const conditions: readonly ConditionDecision[] = raw.conditions.map((c) => ({
    condition: c.condition,
    decision: (c.decision as 'granted' | 'denied' | 'deferred'),
    ratingPercent: c.ratingPercent ?? null,
    effectiveDate: c.effectiveDate ?? null,
    reasoningPlainEnglish: c.reasoningPlainEnglish,
    evidenceCited: c.evidenceCited,
    evidenceMissing: c.evidenceMissing,
  }));

  const evidenceAnalysis: EvidenceAnalysis = {
    cited: raw.evidenceAnalysis.cited,
    missing: raw.evidenceAnalysis.missing,
    recommendations: raw.evidenceAnalysis.recommendations,
  };

  const appealOptions: readonly AppealOption[] = raw.appealOptions.map((a) => ({
    name: a.name,
    deadline: a.deadline,
    description: a.description,
    cfrCitation: a.cfrCitation,
  }));

  const combinedRating: RatingCalculation = {
    conditions: raw.combinedRating.conditions,
    combinedPercent: raw.combinedRating.combinedPercent,
    calculationSteps: raw.combinedRating.calculationSteps,
  };

  return { sessionId, summary: raw.summary, conditions, evidenceAnalysis, appealOptions, combinedRating };
}

async function analyze(
  sessionId: string,
  documentText: string,
  deps: DecisionLetterHandlerDeps,
): Promise<DecisionLetterAnalysis> {
  const skillPrompt = await deps.promptLoader.load('va_expert');

  // Combine skill identity framing with the structured JSON instruction
  const systemPrompt = `${skillPrompt}\n\n${JSON_ANALYSIS_INSTRUCTION}`;

  const request: AIRequest = {
    sessionId,
    sanitizedText: documentText,
    contextChunks: [systemPrompt],
    skillId: 'va_expert',
    model: MODELS.reasoning,
    timestamp: new Date().toISOString(),
  };

  const rawResponse: AIResponse = await deps.provider.complete(request);

  // Run through compliance gate before the analysis result leaves this handler
  await ComplianceEngine.evaluateAndEmit(rawResponse);

  let analysis: DecisionLetterAnalysis;

  try {
    const parsed = JSON.parse(rawResponse.text) as RawAnalysisJson;
    analysis = parseAnalysis(sessionId, parsed);
  } catch {
    // If Claude returns malformed JSON, surface the raw text as the summary
    analysis = buildFallbackAnalysis(sessionId, rawResponse.text);
  }

  return analysis;
}

export const DecisionLetterHandler = { analyze } as const;
