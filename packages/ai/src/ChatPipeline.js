// ChatPipeline.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: End-to-end chat pipeline — sanitize → AI → legal → compliance → RESPONSE_READY
import { eventBus, EVENTS } from '@vetassist/events';
import { ComplianceEngine } from '@vetassist/compliance';
import { LegalBoundaryEngine } from '@vetassist/legal';
import { MODELS } from '@vetassist/shared-config';
// Dependency-injected pipeline — no hardcoded provider or context fetcher
async function run(input, sanitizedText, deps) {
    const contextChunks = deps.contextChunksFetcher
        ? await deps.contextChunksFetcher(sanitizedText)
        : [];
    const request = {
        sessionId: input.sessionId,
        sanitizedText,
        contextChunks,
        skillId: deps.skillId ?? 'va_expert',
        model: MODELS.reasoning,
        timestamp: new Date().toISOString(),
    };
    await eventBus.emit(EVENTS.AI_REQUEST_STARTED, request);
    const rawResponse = await deps.provider.complete(request);
    await eventBus.emit(EVENTS.AI_RESPONSE_RECEIVED, rawResponse);
    // Legal boundary pass — rewrites directives and appends VSO referral if needed
    const legalResult = await LegalBoundaryEngine.enforceAndEmit(rawResponse);
    // Build a response object with the legally-modified text for compliance evaluation
    const legallyModifiedResponse = {
        ...rawResponse,
        text: legalResult.modifiedText,
    };
    // Compliance gate — mandatory, always runs
    const complianceResult = await ComplianceEngine.evaluateAndEmit(legallyModifiedResponse);
    const finalText = complianceResult.modifiedText;
    const citations = rawResponse.citations;
    // Only emit RESPONSE_READY when compliance fully passed — subscribers must not receive blocked responses
    if (complianceResult.passed) {
        await eventBus.emit(EVENTS.RESPONSE_READY, {
            sessionId: input.sessionId,
            text: finalText,
            citations,
        });
    }
    return {
        sessionId: input.sessionId,
        responseText: finalText,
        citations,
        compliancePassed: complianceResult.passed,
    };
}
export const ChatPipeline = { run };
//# sourceMappingURL=ChatPipeline.js.map