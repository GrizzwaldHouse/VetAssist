// CrisisDetector.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Detects crisis language in user input — stops pipeline and surfaces Veterans Crisis Line
import { eventBus, EVENTS } from '@vetassist/events';
import { THRESHOLDS, CRISIS_LINE } from '@vetassist/shared-config';
// High-signal phrases — these alone are sufficient to trigger a crisis response
const HIGH_CONFIDENCE_PHRASES = [
    'kill myself',
    'end my life',
    'take my life',
    'want to die',
    'want to be dead',
    "don't want to be here",
    "don't want to live",
    'thinking about suicide',
    'commit suicide',
    'end it all',
    'no reason to live',
    'better off dead',
    'better off without me',
];
// Medium-signal phrases — require additional context word to trigger
const MEDIUM_CONFIDENCE_PHRASES = [
    "can't go on",
    "can't take it anymore",
    'give up on life',
    'no point anymore',
    'hopeless',
    'worthless',
    'nothing left',
    "don't see the point",
    'tired of living',
    'ready to give up',
];
function buildCrisisResponse() {
    return [
        CRISIS_LINE.displayText,
        '',
        'You are not alone. Please reach out — support is available 24/7, free and confidential.',
    ].join('\n');
}
// Scores confidence 0.0–1.0 based on matched phrases
function detectCrisis(text) {
    const lower = text.toLowerCase();
    const matched = [];
    let confidence = 0;
    for (const phrase of HIGH_CONFIDENCE_PHRASES) {
        if (lower.includes(phrase)) {
            matched.push(phrase);
            confidence = Math.max(confidence, 0.95);
        }
    }
    for (const phrase of MEDIUM_CONFIDENCE_PHRASES) {
        if (lower.includes(phrase)) {
            matched.push(phrase);
            // Medium phrases raise confidence but don't trigger on their own at the block threshold
            confidence = Math.max(confidence, 0.6);
        }
    }
    return {
        isCrisis: confidence >= THRESHOLDS.crisis.confidenceBlock,
        confidence,
        matchedPhrases: matched,
    };
}
// Returns the crisis response text — never null when isCrisis is true
function getCrisisResponseText() {
    return buildCrisisResponse();
}
// Full pipeline: detect, emit if crisis, return result
async function detectAndEmit(input) {
    const result = detectCrisis(input.text);
    if (result.isCrisis) {
        await eventBus.emit(EVENTS.CRISIS_DETECTED, {
            sessionId: input.sessionId,
            result,
        });
    }
    return result;
}
export const CrisisDetector = {
    detectCrisis,
    detectAndEmit,
    getCrisisResponseText,
};
//# sourceMappingURL=CrisisDetector.js.map