import type { ComplianceResult, AIResponse } from '@vetassist/shared-types';
declare function evaluate(response: AIResponse): Promise<ComplianceResult>;
declare function evaluateAndEmit(response: AIResponse): Promise<ComplianceResult>;
export declare const ComplianceEngine: {
    readonly evaluate: typeof evaluate;
    readonly evaluateAndEmit: typeof evaluateAndEmit;
};
export {};
//# sourceMappingURL=ComplianceEngine.d.ts.map