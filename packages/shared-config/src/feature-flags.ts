// feature-flags.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Feature flag configuration — all capabilities togglable via environment

import type { FeatureFlagsShape } from './types.js';

function loadFeatureFlags(): FeatureFlagsShape {
  const flag = (key: string, defaultValue = false): boolean => {
    const val = process.env[key];
    if (val === undefined) return defaultValue;
    return val === 'true';
  };

  return {
    ragEnabled: flag('FEATURE_RAG', true),
    communityEnabled: flag('FEATURE_COMMUNITY', false),
    mobileEnabled: flag('FEATURE_MOBILE', false),
    offlineCacheEnabled: flag('FEATURE_OFFLINE_CACHE', false),
    strictScoringDefault: flag('FEATURE_STRICT_SCORING', false),
    analyticsEnabled: flag('FEATURE_ANALYTICS', false),
    presidioEnabled: flag('FEATURE_PRESIDIO', true),
    huggingFaceNerEnabled: flag('FEATURE_HF_NER', false),
  };
}

export const FeatureFlags: FeatureFlagsShape = loadFeatureFlags();
