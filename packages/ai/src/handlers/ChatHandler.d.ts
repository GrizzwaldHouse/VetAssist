import type { UserInput } from '@vetassist/shared-types';
import type { ChatPipelineResult } from '../ChatPipeline.js';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';
interface ChatHandlerDependencies {
    readonly provider: AIProvider;
    readonly promptLoader: PromptLoader;
    readonly contextFetcher?: (query: string) => Promise<readonly string[]>;
}
declare function handle(input: UserInput, sanitizedText: string, deps: ChatHandlerDependencies): Promise<ChatPipelineResult>;
export declare const ChatHandler: {
    readonly handle: typeof handle;
};
export {};
//# sourceMappingURL=ChatHandler.d.ts.map