import type { Thresholds } from './types.js';
export declare const THRESHOLDS: Thresholds;
export declare const MODELS: {
    readonly reasoning: "claude-sonnet-4-6";
    readonly classification: "claude-haiku-4-5-20251001";
};
export declare const DOCUMENT_LIMITS: {
    readonly maxBytes: number;
    readonly defaultTtlHours: 24;
    readonly maxTtlDays: 30;
    readonly acceptedMimeTypes: readonly ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/tiff", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
};
export declare const CRISIS_LINE: {
    readonly phone: "988";
    readonly phonePrompt: "Press 1";
    readonly sms: "838255";
    readonly chatUrl: "VeteransCrisisLine.net";
    readonly displayText: "If you are in crisis: Call 988 (Press 1) | Text 838255 | Chat VeteransCrisisLine.net";
};
export declare const VSO_REFERRAL: {
    readonly text: "For personalized guidance on your specific situation, a VA-accredited Veterans Service Organization (VSO) representative can help you at no cost.";
    readonly url: "https://www.va.gov/vso/";
};
export declare const UPLOAD_CONFIG: {
    readonly maxFileSizeBytes: number;
    readonly defaultTtlMs: number;
    readonly maxTtlMs: number;
    readonly allowedMimeTypes: readonly ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/tiff", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    readonly tempDirEnvKey: "UPLOAD_TEMP_DIR";
    readonly encryptionAlgorithm: "aes-256-cbc";
};
export declare const BENEFITS_CONFIG: {
    readonly maxSearchResults: 50;
    readonly hiddenGemsCount: 5;
    readonly defaultCategory: "all";
};
//# sourceMappingURL=constants.d.ts.map