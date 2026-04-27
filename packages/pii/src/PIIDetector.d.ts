import type { PIIDetectionResult, PIIDetectionEvent, PIIType, UserInput } from '@vetassist/shared-types';
declare function detectPIITypes(text: string): PIIType[];
declare function scan(text: string): PIIDetectionResult;
declare function scanAndEmit(input: UserInput, location: PIIDetectionEvent['location']): Promise<PIIDetectionResult>;
export declare const PIIDetector: {
    readonly scan: typeof scan;
    readonly scanAndEmit: typeof scanAndEmit;
    readonly detectPIITypes: typeof detectPIITypes;
};
export {};
//# sourceMappingURL=PIIDetector.d.ts.map