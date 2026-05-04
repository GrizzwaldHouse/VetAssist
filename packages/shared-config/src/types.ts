// types.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: TypeScript shape definitions for all config objects

export interface Thresholds {
  readonly pii: {
    readonly ssnMinDigits: number;
    readonly luhnMinLength: number;
    readonly luhnMaxLength: number;
    readonly vaFileNumberMinDigits: number;
  };
  readonly crisis: {
    readonly confidenceBlock: number;
    readonly confidenceWarn: number;
  };
  readonly moderation: {
    readonly toxicityBlock: number;
    readonly spamBlock: number;
  };
  readonly compliance: {
    readonly confidenceLow: number;
    readonly confidenceMedium: number;
  };
}

export interface AppConfigShape {
  readonly apiUrl: string;
  readonly authDomain: string;
  readonly authClientId: string;
  readonly chromaUrl: string;
  readonly posthogKey: string;
  readonly documentMaxBytes: number;
  readonly documentDefaultTtlHours: number;
  readonly documentMaxTtlDays: number;
  readonly scoringDefaultMode: 'encouraging' | 'strict';
  readonly paywallEnabled: boolean;
}

export interface FeatureFlagsShape {
  readonly ragEnabled: boolean;
  readonly communityEnabled: boolean;
  readonly mobileEnabled: boolean;
  readonly offlineCacheEnabled: boolean;
  readonly strictScoringDefault: boolean;
  readonly analyticsEnabled: boolean;
  readonly presidioEnabled: boolean;
  readonly huggingFaceNerEnabled: boolean;
  // OFF by default — gates the accredited advisory layer until formally enabled
  readonly accreditedServiceEnabled: boolean;
}
