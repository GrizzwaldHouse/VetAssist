// AnalyticsService.ts
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Orchestrates event tracking, consent management, aggregation, and grant report generation

import { randomUUID } from 'crypto';
import type { AnalyticsEvent, UsageAggregates, GrantReport } from '@vetassist/shared-types';
import { PostHogAdapter } from './PostHogAdapter.js';
import { GrantReportGenerator } from './GrantReportGenerator.js';

// In-memory consent map — keyed by sessionId, populated from API consent route
const _consentMap = new Map<string, boolean>();
const _generator  = new GrantReportGenerator();

export const AnalyticsService = {
  // Records consent decision for a session — called by the API consent route
  setConsent(sessionId: string, granted: boolean): void {
    _consentMap.set(sessionId, granted);
  },

  isConsentGranted(sessionId: string): boolean {
    return _consentMap.get(sessionId) ?? false;
  },

  // Forwards a PII-free event to PostHog — no-ops when consent not granted
  trackEvent(event: AnalyticsEvent): void {
    if (!AnalyticsService.isConsentGranted(event.sessionId)) return;
    PostHogAdapter.capture(event.sessionId, event.name, event.properties);
  },

  // Returns zeroed aggregates — real implementation would query PostHog's REST API
  // Placeholder until POSTHOG_PROJECT_ID and PostHog REST client are configured in prod
  async getAggregates(_periodStart: string, _periodEnd: string): Promise<UsageAggregates> {
    return {
      veteransServed: 0,
      documentsReviewed: 0,
      benefitsDiscovered: 0,
      decisionLettersAnalyzed: 0,
      crisisDetections: 0,
      accessibilitySessions: 0,
      communityStoriesSubmitted: 0,
    };
  },

  async generateGrantReport(periodStart: string, periodEnd: string): Promise<GrantReport> {
    const aggregates = await AnalyticsService.getAggregates(periodStart, periodEnd);
    const report: GrantReport = {
      reportId:    randomUUID(),
      generatedAt: new Date().toISOString(),
      periodStart,
      periodEnd,
      aggregates,
      pdfBase64:   '',
    };
    const pdfBase64 = _generator.buildPdf(report);
    return { ...report, pdfBase64 };
  },
} as const;
