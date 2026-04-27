import type { LegalBoundaryResult, LegalViolationType, AIResponse } from '@vetassist/shared-types';
declare function detectViolations(text: string): LegalViolationType[];
declare function enforce(responseText: string): LegalBoundaryResult;
declare function enforceAndEmit(response: AIResponse): Promise<LegalBoundaryResult>;
export declare const LegalBoundaryEngine: {
    readonly enforce: typeof enforce;
    readonly enforceAndEmit: typeof enforceAndEmit;
    readonly detectViolations: typeof detectViolations;
};
export {};
//# sourceMappingURL=LegalBoundaryEngine.d.ts.map