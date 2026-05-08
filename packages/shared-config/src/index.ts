// index.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Public exports for @vetassist/shared-config package

export { AppConfig } from './app-config.js';
export { FeatureFlags } from './feature-flags.js';
export { THRESHOLDS, MODELS, DOCUMENT_LIMITS, CRISIS_LINE, VSO_REFERRAL, UPLOAD_CONFIG, BENEFITS_CONFIG, RESTRICTED_STATES, ANALYTICS_CONFIG, ANALYTICS_EVENTS, ML_PIPELINE, SCRAPER_CONFIG, REGULATORY_RELEVANCE_KEYWORDS } from './constants.js';
export type { AppConfigShape, FeatureFlagsShape, Thresholds } from './types.js';
export type { AnalyticsEventName } from './constants.js';
