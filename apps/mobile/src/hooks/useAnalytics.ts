// useAnalytics.ts
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: React Native hook — anonymous event tracking with consent gate and PII strip

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ANALYTICS_CONFIG } from '@vetassist/shared-config';
import type { AnalyticsEventName } from '@vetassist/shared-config';

const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

// PII key names that must never appear in event properties
const PII_PROPERTY_KEYS: ReadonlySet<string> = new Set([
  'ssn', 'name', 'email', 'phone', 'address', 'text', 'content', 'message',
]);

type EventProperties = Record<string, string | number | boolean>;

function stripPiiFromProps(props: EventProperties): EventProperties {
  return Object.fromEntries(
    Object.entries(props).filter(([k]) => !PII_PROPERTY_KEYS.has(k.toLowerCase())),
  );
}

// PII regex check on string values — strips value if it looks like an SSN or phone
const PII_VALUE_PATTERN = /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b|\b\d{10,11}\b/;

function sanitiseProps(props: EventProperties): EventProperties {
  const stripped = stripPiiFromProps(props);
  return Object.fromEntries(
    Object.entries(stripped).map(([k, v]) => {
      if (typeof v === 'string' && PII_VALUE_PATTERN.test(v)) {
        return [k, '[REDACTED]'];
      }
      return [k, v];
    }),
  );
}

export interface UseAnalyticsReturn {
  readonly trackEvent: (name: AnalyticsEventName, properties?: EventProperties) => void;
}

export function useAnalytics(): UseAnalyticsReturn {
  const trackEvent = useCallback(
    (name: AnalyticsEventName, properties: EventProperties = {}): void => {
      // Fire-and-forget — analytics must never block UI or throw
      void (async () => {
        try {
          // Consent gate — read from AsyncStorage
          const consentRaw = await AsyncStorage.getItem(ANALYTICS_CONFIG.consentStorageKey);
          if (consentRaw !== 'true') return;

          // Offline gate — skip when no connection
          const netState = await NetInfo.fetch();
          const isOnline = netState.isConnected === true && netState.isInternetReachable !== false;
          if (!isOnline) return;

          // Session ID gate — read pseudonymous session from storage
          const sessionId = await AsyncStorage.getItem(ANALYTICS_CONFIG.sessionIdStorageKey);
          if (!sessionId) return;

          const safeProps = sanitiseProps(properties);

          await fetch(`${API_BASE}/analytics/events`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              name,
              properties: safeProps,
              sessionId,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch {
          // Analytics errors are silent — never surface to the user
        }
      })();
    },
    [],
  );

  return { trackEvent };
}
