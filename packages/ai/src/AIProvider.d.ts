import type { AIRequest, AIResponse } from '@vetassist/shared-types';
export interface AIProvider {
    complete(request: AIRequest): Promise<AIResponse>;
}
declare class ClaudeProvider implements AIProvider {
    #private;
    constructor(apiKey: string);
    complete(request: AIRequest): Promise<AIResponse>;
}
declare class MockAIProvider implements AIProvider {
    #private;
    constructor(responses?: Map<string, string>);
    complete(request: AIRequest): Promise<AIResponse>;
}
declare function createProvider(apiKey?: string): AIProvider;
export { ClaudeProvider, MockAIProvider, createProvider };
//# sourceMappingURL=AIProvider.d.ts.map