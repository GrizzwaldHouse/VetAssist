import type { CrisisResult, UserInput } from '@vetassist/shared-types';
declare function detectCrisis(text: string): CrisisResult;
declare function getCrisisResponseText(): string;
declare function detectAndEmit(input: UserInput): Promise<CrisisResult>;
export declare const CrisisDetector: {
    readonly detectCrisis: typeof detectCrisis;
    readonly detectAndEmit: typeof detectAndEmit;
    readonly getCrisisResponseText: typeof getCrisisResponseText;
};
export {};
//# sourceMappingURL=CrisisDetector.d.ts.map