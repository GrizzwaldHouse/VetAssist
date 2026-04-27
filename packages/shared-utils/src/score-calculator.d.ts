import type { ScoreCategory, ScoreResult } from '@vetassist/shared-types';
declare function calculateOverall(categories: readonly ScoreCategory[]): number;
declare function buildScoreResult(categories: readonly ScoreCategory[], mode: ScoreResult['mode'], suggestions: ScoreResult['suggestions']): ScoreResult;
export declare const ScoreCalculator: {
    readonly calculateOverall: typeof calculateOverall;
    readonly buildScoreResult: typeof buildScoreResult;
};
export {};
//# sourceMappingURL=score-calculator.d.ts.map