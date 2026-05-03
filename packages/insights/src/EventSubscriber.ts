// EventSubscriber.ts
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Subscribes to internal VetAssist events and forwards anonymous counts to PostHog

import { eventBus, EVENTS } from '@vetassist/events';
import { ANALYTICS_EVENTS } from '@vetassist/shared-config';
import { PostHogAdapter } from './PostHogAdapter.js';

const FALLBACK_SESSION = 'anonymous';

// Registers all event→PostHog mappings — call once at server startup
export function registerEventSubscriber(): void {
  eventBus.subscribe(EVENTS.CRISIS_DETECTED, async (payload) => {
    PostHogAdapter.capture(payload.sessionId ?? FALLBACK_SESSION, ANALYTICS_EVENTS.CRISIS_DETECTED_AND_HANDLED, {
      feature: 'crisis',
      timestamp: new Date().toISOString(),
    });
  });

  // DOCUMENT_UPLOADED payload has no sessionId — use fallback to preserve pseudonymity
  eventBus.subscribe(EVENTS.DOCUMENT_UPLOADED, async (_payload) => {
    PostHogAdapter.capture(FALLBACK_SESSION, ANALYTICS_EVENTS.DOCUMENT_REVIEW_INITIATED, {
      feature: 'document_upload',
      timestamp: new Date().toISOString(),
    });
  });

  eventBus.subscribe(EVENTS.DOCUMENT_GENERATED, async (payload) => {
    PostHogAdapter.capture(payload.sessionId ?? FALLBACK_SESSION, ANALYTICS_EVENTS.DOCUMENT_REVIEW_INITIATED, {
      feature: 'document_generate',
      timestamp: new Date().toISOString(),
    });
  });

  eventBus.subscribe(EVENTS.COMPLIANCE_PASSED, async (payload) => {
    PostHogAdapter.capture(payload.sessionId, ANALYTICS_EVENTS.DOCUMENT_SCORE_RETURNED, {
      feature: 'compliance',
      timestamp: new Date().toISOString(),
    });
  });

  // CLAIM_CREATED is not in the typed EventPayloadMap — benefits search is tracked via
  // the COMPLIANCE_PASSED event that fires at the end of every successful AI response
}
