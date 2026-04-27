import type { DecisionLetterAnalysis } from '@vetassist/shared-types';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';
interface DecisionLetterHandlerDeps {
    readonly provider: AIProvider;
    readonly promptLoader: PromptLoader;
}
declare function analyze(sessionId: string, documentText: string, deps: DecisionLetterHandlerDeps): Promise<DecisionLetterAnalysis>;
export declare const DecisionLetterHandler: {
    readonly analyze: typeof analyze;
};
export {};
//# sourceMappingURL=DecisionLetterHandler.d.ts.map