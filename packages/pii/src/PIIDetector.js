// PIIDetector.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Client-side PII detection — detects SSN, credit card, VA file numbers, DOB
// Emits PII_DETECTED event and blocks pipeline if PII is found
import { randomUUID } from 'crypto';
import { eventBus, EVENTS } from '@vetassist/events';
import { RegexUtils, LuhnValidator, TextSanitizer } from '@vetassist/shared-utils';
// Returns which PII types are present in the text — pure detection, no side effects
function detectPIITypes(text) {
    const found = [];
    if (RegexUtils.SSN_DASHED.test(text) || RegexUtils.SSN_SPACED.test(text) || RegexUtils.SSN_CONSECUTIVE.test(text)) {
        found.push('SSN');
        // Reset lastIndex after test() — regex with /g flag retains state
        RegexUtils.SSN_DASHED.lastIndex = 0;
        RegexUtils.SSN_SPACED.lastIndex = 0;
        RegexUtils.SSN_CONSECUTIVE.lastIndex = 0;
    }
    if (RegexUtils.VA_FILE_NUMBER.test(text)) {
        found.push('VA_FILE_NUMBER');
        RegexUtils.VA_FILE_NUMBER.lastIndex = 0;
    }
    if (RegexUtils.DOB_SLASH.test(text) || RegexUtils.DOB_DASH.test(text) || RegexUtils.DOB_ISO.test(text)) {
        found.push('DOB');
        RegexUtils.DOB_SLASH.lastIndex = 0;
        RegexUtils.DOB_DASH.lastIndex = 0;
        RegexUtils.DOB_ISO.lastIndex = 0;
    }
    const creditCards = LuhnValidator.findCreditCards(text);
    if (creditCards.length > 0) {
        found.push('CREDIT_CARD');
    }
    return found;
}
// Sanitizes text and returns a detection result — does not emit events
function scan(text) {
    const detectedTypes = detectPIITypes(text);
    const hasPII = detectedTypes.length > 0;
    let sanitizedText = TextSanitizer.sanitizeAll(text);
    // Also redact any confirmed credit card numbers
    const creditCards = LuhnValidator.findCreditCards(text);
    for (const digits of creditCards) {
        sanitizedText = TextSanitizer.redactCreditCardDigits(sanitizedText, digits);
    }
    return {
        hasPII,
        detectedTypes,
        sanitizedText,
        action: hasPII ? 'blocked' : 'stripped',
    };
}
// Full pipeline: scan, emit events, return result
// Caller is responsible for halting pipeline if result.hasPII === true
async function scanAndEmit(input, location) {
    const result = scan(input.text);
    if (result.hasPII) {
        for (const piiType of result.detectedTypes) {
            const event = {
                eventId: randomUUID(),
                type: piiType,
                location,
                action: result.action,
                timestamp: new Date().toISOString(),
                detectionLayer: 'client_regex',
            };
            // Emit each detection type as a separate audit event — never logs the actual value
            await eventBus.emit(EVENTS.PII_DETECTED, event);
        }
    }
    else {
        await eventBus.emit(EVENTS.INPUT_SANITIZED, {
            sessionId: input.sessionId,
            sanitizedText: result.sanitizedText,
        });
    }
    return result;
}
export const PIIDetector = {
    scan,
    scanAndEmit,
    detectPIITypes,
};
//# sourceMappingURL=PIIDetector.js.map