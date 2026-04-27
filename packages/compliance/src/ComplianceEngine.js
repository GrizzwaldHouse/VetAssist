// ComplianceEngine.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Mandatory compliance gate — every AI response passes through before reaching the user
// Runs: crisis check, PII scrub, medical advice, legal advice, outcome guarantees, exaggeration
import { eventBus, EVENTS } from '@vetassist/events';
import { CrisisDetector } from '@vetassist/crisis';
import { LegalBoundaryEngine } from '@vetassist/legal';
import { TextSanitizer } from '@vetassist/shared-utils';
const EDUCATIONAL_DISCLAIMER = 'This information is for educational purposes only. It does not constitute legal or medical advice. Please consult a VA-accredited VSO or qualified professional for guidance specific to your situation.';
// Medical advice patterns in AI output
const MEDICAL_ADVICE_PATTERNS = [
    /\byou have\s+(PTSD|TBI|depression|anxiety|diabetes|cancer|hypertension)\b/gi,
    /\byou suffer from\b/gi,
    /\byour diagnosis is\b/gi,
    /\byou should take\b/gi,
    /\bstop taking\b/gi,
    /\bincrease your dosage\b/gi,
];
// Exaggeration language that could incentivize inflation
const EXAGGERATION_PATTERNS = [
    /\bmake sure (to|you) include every\b/gi,
    /\bexaggerate\b/gi,
    /\boverstate\b/gi,
    /\bsound worse\b/gi,
    /\bmaximize your (rating|percentage|claim)\b/gi,
];
function checkMedicalAdvice(text) {
    const detected = MEDICAL_ADVICE_PATTERNS.some((p) => {
        const result = p.test(text);
        p.lastIndex = 0;
        return result;
    });
    return {
        type: 'medical_advice',
        detected,
        severity: 'block',
    };
}
function checkExaggerationLanguage(text) {
    const detected = EXAGGERATION_PATTERNS.some((p) => {
        const result = p.test(text);
        p.lastIndex = 0;
        return result;
    });
    return {
        type: 'exaggeration_language',
        detected,
        severity: 'block',
    };
}
function checkPIIInResponse(text) {
    const sanitized = TextSanitizer.sanitizeAll(text);
    return {
        type: 'pii_in_response',
        detected: sanitized !== text,
        severity: 'modify',
    };
}
// Runs all compliance checks in order — returns full result with modified text
async function evaluate(response) {
    // Crisis check on AI output (defense in depth — should have been caught on input)
    const crisisResult = CrisisDetector.detectCrisis(response.text);
    const crisisCheck = {
        type: 'crisis_keywords',
        detected: crisisResult.isCrisis,
        severity: 'block',
    };
    const medicalCheck = checkMedicalAdvice(response.text);
    const exaggerationCheck = checkExaggerationLanguage(response.text);
    const piiCheck = checkPIIInResponse(response.text);
    // Legal boundary engine handles legal_advice and guaranteed_outcome
    const legalResult = LegalBoundaryEngine.enforce(response.text);
    const legalAdviceCheck = {
        type: 'legal_advice',
        detected: legalResult.violationTypes.includes('directive_language') ||
            legalResult.violationTypes.includes('eligibility_statement'),
        severity: 'modify',
    };
    const outcomeCheck = {
        type: 'guaranteed_outcome',
        detected: legalResult.violationTypes.includes('outcome_guarantee'),
        severity: 'modify',
    };
    const checks = [
        crisisCheck,
        medicalCheck,
        exaggerationCheck,
        piiCheck,
        legalAdviceCheck,
        outcomeCheck,
    ];
    const hasBlockingViolation = checks.some((c) => c.detected && c.severity === 'block');
    const passed = !hasBlockingViolation;
    // Build modified text — start from legal engine's output (already rewritten)
    let modifiedText = legalResult.modifiedText;
    // If crisis detected in output, prepend crisis line
    if (crisisCheck.detected) {
        modifiedText = `${CrisisDetector.getCrisisResponseText()}\n\n${modifiedText}`;
    }
    // Scrub any PII that slipped through
    if (piiCheck.detected) {
        modifiedText = TextSanitizer.sanitizeAll(modifiedText);
    }
    // Disclaimer always appended
    modifiedText = `${modifiedText}\n\n${EDUCATIONAL_DISCLAIMER}`;
    return {
        passed,
        checks,
        modifiedText,
        disclaimerAppended: true,
    };
}
// Full pipeline: evaluate, emit appropriate event, return result
async function evaluateAndEmit(response) {
    const result = await evaluate(response);
    if (!result.passed) {
        await eventBus.emit(EVENTS.COMPLIANCE_FAILED, {
            sessionId: response.sessionId,
            result,
        });
    }
    else {
        await eventBus.emit(EVENTS.COMPLIANCE_PASSED, {
            sessionId: response.sessionId,
            finalText: result.modifiedText,
        });
    }
    return result;
}
export const ComplianceEngine = {
    evaluate,
    evaluateAndEmit,
};
//# sourceMappingURL=ComplianceEngine.js.map