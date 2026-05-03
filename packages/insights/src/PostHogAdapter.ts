// PostHogAdapter.ts
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Singleton wrapper around posthog-node — guards by feature flag, strips PII keys before capture

import { PostHog } from 'posthog-node';
import { AppConfig, FeatureFlags } from '@vetassist/shared-config';

// PII-sensitive key names that must never appear in PostHog properties
const PII_PROPERTY_KEYS: ReadonlySet<string> = new Set([
  'ssn', 'social_security', 'name', 'email', 'phone', 'address',
  'dob', 'date_of_birth', 'va_file_number', 'text', 'content', 'message',
]);

const POSTHOG_HOST = process.env['POSTHOG_HOST'] ?? 'https://app.posthog.com';

let _client: PostHog | null = null;

function getClient(): PostHog | null {
  if (!FeatureFlags.analyticsEnabled) return null;
  if (_client) return _client;
  _client = new PostHog(AppConfig.posthogKey, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 30_000,
  });
  return _client;
}

// Removes any property whose key matches a known PII field name
function stripPiiKeys(
  properties: Readonly<Record<string, string | number | boolean>>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter(([key]) => !PII_PROPERTY_KEYS.has(key.toLowerCase())),
  );
}

export const PostHogAdapter = {
  // Captures a pseudonymous event — sessionId is the distinct_id, never a real userId
  capture(
    sessionId: string,
    eventName: string,
    properties: Readonly<Record<string, string | number | boolean>>,
  ): void {
    const client = getClient();
    if (!client) return;
    client.capture({
      distinctId: sessionId,
      event: eventName,
      properties: stripPiiKeys(properties),
    });
  },

  // Flushes the queue and closes the client — call on process exit
  async shutdown(): Promise<void> {
    if (_client) {
      await _client.shutdown();
      _client = null;
    }
  },
} as const;
