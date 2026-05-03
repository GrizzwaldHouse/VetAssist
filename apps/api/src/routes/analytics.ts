// analytics.ts
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Analytics routes — consent management, event ingestion, admin dashboard, public impact metrics

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { AnalyticsEvent, UsageAggregates, GrantReport } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { AnalyticsService } from '@vetassist/insights';
import { accreditedGuard } from '../middleware/accreditedGuard.js';

const ConsentSchema = z.object({
  analytics: z.boolean(),
  sessionId: z.string().min(1),
});

const EventSchema = z.object({
  name:       z.string().min(1).max(100),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])),
  sessionId:  z.string().min(1),
  timestamp:  z.string(),
});

// Keys that must never appear in captured event properties — defense-in-depth
const PII_KEYS: ReadonlySet<string> = new Set([
  'ssn', 'name', 'email', 'phone', 'address', 'text', 'content',
]);

function stripPiiFromProperties(
  props: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(props).filter(([k]) => !PII_KEYS.has(k.toLowerCase())),
  );
}

// Returns the start of the current UTC month as ISO string
function currentMonthStart(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export const analyticsRoute: FastifyPluginAsync = async (fastify) => {
  // POST /api/analytics/consent — record opt-in or opt-out for a session
  fastify.post('/analytics/consent', async (request, reply) => {
    const parsed = ConsentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid request', errors: parsed.error.issues });
    }

    const { analytics, sessionId } = parsed.data;
    AnalyticsService.setConsent(sessionId, analytics);

    const eventName = analytics ? EVENTS.ANALYTICS_CONSENT_GRANTED : EVENTS.ANALYTICS_CONSENT_REVOKED;
    eventBus.emit(eventName, { sessionId, timestamp: new Date().toISOString() });

    return reply.status(200).send({ ok: true, analytics, sessionId });
  });

  // GET /api/analytics/consent/:sid — check consent status for a session
  fastify.get('/analytics/consent/:sid', async (request, reply) => {
    const { sid } = request.params as { sid: string };
    const granted = AnalyticsService.isConsentGranted(sid);
    return reply.status(200).send({ sessionId: sid, analytics: granted });
  });

  // POST /api/analytics/events — receive a client-side event, PII-scrub, forward to PostHog
  fastify.post('/analytics/events', async (request, reply) => {
    const parsed = EventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid request', errors: parsed.error.issues });
    }

    const { name, properties, sessionId, timestamp } = parsed.data;

    if (!AnalyticsService.isConsentGranted(sessionId)) {
      // Silently drop — no-op is correct when consent not granted
      return reply.status(200).send({ ok: true, dropped: true });
    }

    const event: AnalyticsEvent = {
      name,
      properties: stripPiiFromProperties(properties),
      sessionId,
      timestamp,
    };

    AnalyticsService.trackEvent(event);
    eventBus.emit(EVENTS.ANALYTICS_EVENT_CAPTURED, event);

    return reply.status(200).send({ ok: true });
  });

  // GET /api/analytics/impact — public endpoint, returns current-month aggregates only
  fastify.get('/analytics/impact', async (_request, reply) => {
    const periodStart = currentMonthStart();
    const periodEnd   = new Date().toISOString();
    const aggregates: UsageAggregates = await AnalyticsService.getAggregates(periodStart, periodEnd);
    return reply.status(200).send({ aggregates, periodStart, periodEnd });
  });

  // GET /api/admin/analytics/dashboard — admin only, returns aggregates for date range
  fastify.get(
    '/admin/analytics/dashboard',
    { preHandler: accreditedGuard },
    async (request, reply) => {
      const query       = request.query as Record<string, string>;
      const periodStart = query['from'] ?? currentMonthStart();
      const periodEnd   = query['to']   ?? new Date().toISOString();
      const aggregates: UsageAggregates = await AnalyticsService.getAggregates(periodStart, periodEnd);
      return reply.status(200).send({ aggregates, periodStart, periodEnd });
    },
  );

  // GET /api/admin/analytics/report — admin only, generates GrantReport PDF
  fastify.get(
    '/admin/analytics/report',
    { preHandler: accreditedGuard },
    async (request, reply) => {
      const query       = request.query as Record<string, string>;
      const periodStart = query['from'] ?? currentMonthStart();
      const periodEnd   = query['to']   ?? new Date().toISOString();
      const report: GrantReport = await AnalyticsService.generateGrantReport(periodStart, periodEnd);
      return reply.status(200).send(report);
    },
  );
};
