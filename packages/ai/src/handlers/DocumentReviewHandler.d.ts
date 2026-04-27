import type { ScoreResult } from '@vetassist/shared-types';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';
interface DocumentReviewDeps {
    readonly provider: AIProvider;
    readonly promptLoader: PromptLoader;
}
declare function review(sessionId: string, documentText: string, scoringMode: 'encouraging' | 'strict', deps: DocumentReviewDeps): Promise<ScoreResult>;
export declare const DocumentReviewHandler: {
    readonly review: typeof review;
};
export {};
//# sourceMappingURL=DocumentReviewHandler.d.ts.map