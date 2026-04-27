// app-config.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Runtime app configuration — reads from environment variables only

import type { AppConfigShape } from './types.js';
import { DOCUMENT_LIMITS } from './constants.js';

// Reads config lazily — deferred so tests can import the module without env vars set
function loadAppConfig(): AppConfigShape {
  const apiUrl = process.env['VETASSIST_API_URL'];
  const authDomain = process.env['AUTH0_DOMAIN'];
  const authClientId = process.env['AUTH0_CLIENT_ID'];
  const chromaUrl = process.env['CHROMA_URL'];
  const posthogKey = process.env['POSTHOG_KEY'] ?? '';

  if (!apiUrl) throw new Error('[AppConfig] VETASSIST_API_URL is required');
  if (!authDomain) throw new Error('[AppConfig] AUTH0_DOMAIN is required');
  if (!authClientId) throw new Error('[AppConfig] AUTH0_CLIENT_ID is required');
  if (!chromaUrl) throw new Error('[AppConfig] CHROMA_URL is required');

  return {
    apiUrl,
    authDomain,
    authClientId,
    chromaUrl,
    posthogKey,
    documentMaxBytes: DOCUMENT_LIMITS.maxBytes,
    documentDefaultTtlHours: DOCUMENT_LIMITS.defaultTtlHours,
    documentMaxTtlDays: DOCUMENT_LIMITS.maxTtlDays,
    scoringDefaultMode: 'encouraging',
    paywallEnabled: process.env['PAYWALL_ENABLED'] === 'true',
  };
}

// Lazy singleton — loaded on first access so tests can import without all env vars present
let _config: AppConfigShape | null = null;

export function getAppConfig(): AppConfigShape {
  if (!_config) _config = loadAppConfig();
  return _config;
}

// Proxy object for backwards-compatible property access — throws at first use if env missing
export const AppConfig: AppConfigShape = new Proxy({} as AppConfigShape, {
  get(_target, prop) {
    return getAppConfig()[prop as keyof AppConfigShape];
  },
});
