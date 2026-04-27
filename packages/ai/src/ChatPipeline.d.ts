import type { UserInput } from '@vetassist/shared-types';
import type { AIProvider } from './AIProvider.js';
export interface ChatPipelineResult {
    readonly sessionId: string;
    readonly responseText: string;
    readonly citations: readonly string[];
    readonly compliancePassed: boolean;
}
export interface ChatPipelineDependencies {
    readonly provider: AIProvider;
    readonly contextChunksFetcher?: (sanitizedText: string) => Promise<readonly string[]>;
    readonly skillId?: string;
}
declare function run(input: UserInput, sanitizedText: string, deps: ChatPipelineDependencies): Promise<ChatPipelineResult>;
export declare const ChatPipeline: {
    readonly run: typeof run;
};
export {};
//# sourceMappingURL=ChatPipeline.d.ts.map