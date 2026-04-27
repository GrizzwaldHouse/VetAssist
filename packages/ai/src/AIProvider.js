// AIProvider.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: AIProvider interface and factory — Strategy pattern, swappable between Claude and mock
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@vetassist/shared-config';
import { CfrCitationParser } from '@vetassist/shared-utils';
// Real Claude provider — used in production
class ClaudeProvider {
    #client;
    constructor(apiKey) {
        this.#client = new Anthropic({ apiKey });
    }
    async complete(request) {
        const contextBlock = request.contextChunks.length > 0
            ? `\n\nKnowledge base context:\n${request.contextChunks.join('\n---\n')}`
            : '';
        const systemPrompt = `You are VetAssist, an AI educational assistant for veterans' benefits. Always cite specific CFR sections. Never guarantee outcomes. Never provide legal or medical advice.${contextBlock}`;
        const message = await this.#client.messages.create({
            model: request.model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: request.sanitizedText }],
        });
        const textBlock = message.content.find((b) => b.type === 'text');
        const text = textBlock?.type === 'text' ? textBlock.text : '';
        const citations = CfrCitationParser.extractCitations(text);
        return {
            sessionId: request.sessionId,
            text,
            citations,
            confidence: citations.length > 0 ? 'high' : 'medium',
            model: request.model,
            timestamp: new Date().toISOString(),
        };
    }
}
// Mock provider — deterministic responses for testing
class MockAIProvider {
    #responses;
    constructor(responses = new Map()) {
        this.#responses = responses;
    }
    async complete(request) {
        const text = this.#responses.get(request.sanitizedText) ??
            `Educational information: Under 38 CFR § 3.303, direct service connection may be established for a disability resulting from personal injury or disease incurred or aggravated during active military service.`;
        return {
            sessionId: request.sessionId,
            text,
            citations: CfrCitationParser.extractCitations(text),
            confidence: 'high',
            model: MODELS.reasoning,
            timestamp: new Date().toISOString(),
        };
    }
}
// Factory — returns real or mock provider based on environment
function createProvider(apiKey) {
    if (apiKey)
        return new ClaudeProvider(apiKey);
    return new MockAIProvider();
}
export { ClaudeProvider, MockAIProvider, createProvider };
//# sourceMappingURL=AIProvider.js.map