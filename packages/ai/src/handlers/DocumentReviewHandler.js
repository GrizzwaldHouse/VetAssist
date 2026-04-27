// DocumentReviewHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Grammarly-style document review — inline suggestions with CFR alignment scoring
import { MODELS } from '@vetassist/shared-config';
// Valid category names — used to guard incoming AI output
const VALID_CATEGORY_NAMES = new Set([
    'Specificity',
    'Completeness',
    'VA_Alignment',
    'PII_Safety',
]);
// Valid priority values for suggestions
const VALID_PRIORITIES = new Set(['high', 'medium', 'low']);
function buildScoringInstruction(scoringMode) {
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
function buildFallbackScoreResult(scoringMode) {
    return {
        overall: 0,
        mode: scoringMode,
        categories: [],
        suggestions: [],
    };
}
function parseScoreResult(raw) {
    const categories = raw.categories
        .filter((c) => VALID_CATEGORY_NAMES.has(c.name))
        .map((c) => ({
        name: c.name,
        score: c.score,
        feedback: c.feedback,
    }));
    const suggestions = raw.suggestions
        .filter((s) => VALID_PRIORITIES.has(s.priority))
        .map((s) => ({
        id: s.id,
        priority: s.priority,
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
async function review(sessionId, documentText, scoringMode, deps) {
    const skillPrompt = await deps.promptLoader.load('document_reviewer');
    const scoringInstruction = buildScoringInstruction(scoringMode);
    const systemPrompt = `${skillPrompt}\n\n${scoringInstruction}`;
    const request = {
        sessionId,
        sanitizedText: documentText,
        contextChunks: [systemPrompt],
        skillId: 'document_reviewer',
        model: MODELS.reasoning,
        timestamp: new Date().toISOString(),
    };
    const rawResponse = await deps.provider.complete(request);
    try {
        const parsed = JSON.parse(rawResponse.text);
        return parseScoreResult(parsed);
    }
    catch {
        // If Claude returns malformed JSON, return a zero-score fallback so callers never get null
        return buildFallbackScoreResult(scoringMode);
    }
}
export const DocumentReviewHandler = { review };
//# sourceMappingURL=DocumentReviewHandler.js.map