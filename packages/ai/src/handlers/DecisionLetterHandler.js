// DecisionLetterHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: VA Decision Letter analyzer — converts bureaucratic legalese to plain English
import { MODELS } from '@vetassist/shared-config';
import { ComplianceEngine } from '@vetassist/compliance';
// Standard appeal options derived from 38 CFR — same for every decision letter
const STANDARD_APPEAL_OPTIONS = [
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
function buildFallbackAnalysis(sessionId, rawText) {
    return {
        sessionId,
        summary: rawText,
        conditions: [],
        evidenceAnalysis: { cited: [], missing: [], recommendations: [] },
        appealOptions: STANDARD_APPEAL_OPTIONS,
        combinedRating: { conditions: [], combinedPercent: 0, calculationSteps: '' },
    };
}
function parseAnalysis(sessionId, raw) {
    const conditions = raw.conditions.map((c) => ({
        condition: c.condition,
        decision: c.decision,
        ratingPercent: c.ratingPercent ?? null,
        effectiveDate: c.effectiveDate ?? null,
        reasoningPlainEnglish: c.reasoningPlainEnglish,
        evidenceCited: c.evidenceCited,
        evidenceMissing: c.evidenceMissing,
    }));
    const evidenceAnalysis = {
        cited: raw.evidenceAnalysis.cited,
        missing: raw.evidenceAnalysis.missing,
        recommendations: raw.evidenceAnalysis.recommendations,
    };
    const appealOptions = raw.appealOptions.map((a) => ({
        name: a.name,
        deadline: a.deadline,
        description: a.description,
        cfrCitation: a.cfrCitation,
    }));
    const combinedRating = {
        conditions: raw.combinedRating.conditions,
        combinedPercent: raw.combinedRating.combinedPercent,
        calculationSteps: raw.combinedRating.calculationSteps,
    };
    return { sessionId, summary: raw.summary, conditions, evidenceAnalysis, appealOptions, combinedRating };
}
async function analyze(sessionId, documentText, deps) {
    const skillPrompt = await deps.promptLoader.load('va_expert');
    // Combine skill identity framing with the structured JSON instruction
    const systemPrompt = `${skillPrompt}\n\n${JSON_ANALYSIS_INSTRUCTION}`;
    const request = {
        sessionId,
        sanitizedText: documentText,
        contextChunks: [systemPrompt],
        skillId: 'va_expert',
        model: MODELS.reasoning,
        timestamp: new Date().toISOString(),
    };
    const rawResponse = await deps.provider.complete(request);
    // Run through compliance gate before the analysis result leaves this handler
    await ComplianceEngine.evaluateAndEmit(rawResponse);
    let analysis;
    try {
        const parsed = JSON.parse(rawResponse.text);
        analysis = parseAnalysis(sessionId, parsed);
    }
    catch {
        // If Claude returns malformed JSON, surface the raw text as the summary
        analysis = buildFallbackAnalysis(sessionId, rawResponse.text);
    }
    return analysis;
}
export const DecisionLetterHandler = { analyze };
//# sourceMappingURL=DecisionLetterHandler.js.map