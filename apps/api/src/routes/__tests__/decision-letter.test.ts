// decision-letter.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/documents/decision-letter route test suite — VA letter analysis with PII/crisis gates

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { decisionLetterRoute } from '../decision-letter.js';
import { CrisisDetector } from '@vetassist/crisis';
import { PIIDetector } from '@vetassist/pii';
import { DecisionLetterHandler } from '@vetassist/ai';
import { eventBus, EVENTS } from '@vetassist/events';

// ─────────────────────────────────────────────────────────────────────────────
// Test helper: create a mock Fastify instance
// ─────────────────────────────────────────────────────────────────────────────

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  return {
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
}

function getHandler(
  mock: ReturnType<typeof createMockFastify>,
  method: 'post',
  url: string
): (req: unknown, reply: unknown) => unknown {
  const calls = (mock[method] as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown, unknown]>;
  const match = calls.find((c) => c[0] === url);
  if (!match) throw new Error(`No handler registered for ${method.toUpperCase()} ${url}`);
  return match[2] as (req: unknown, reply: unknown) => unknown;
}

describe('decisionLetterRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Input Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Input Validation', () => {
    it('rejects document text under 50 characters', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { documentText: 'short' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects document text exceeding 50000 characters', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { documentText: 'a'.repeat(50001) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Crisis Detection
  // ───────────────────────────────────────────────────────────────────────────

  describe('Crisis Detection', () => {
    it('detects crisis in decision letter and returns crisis response', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: true, matchedPhrases: ['no reason to live'], confidence: 0.9, tier: 1 as const });

      await handler({ body: { documentText: 'a'.repeat(100) + ' I have no reason to live' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          crisisDetected: true,
          message: expect.stringContaining('988'),
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.CRISIS_DETECTED, expect.any(Object));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PII Detection
  // ───────────────────────────────────────────────────────────────────────────

  describe('PII Detection', () => {
    it('redacts PII from decision letter before analysis', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: true, detectedTypes: ['SSN'], sanitizedText: '[REDACTED]', action: 'blocked' as const } as any);
      vi.spyOn(DecisionLetterHandler, 'analyze').mockResolvedValue({ summary: 'Claim denied', nextSteps: ['Appeal'] } as any);

      await handler({ body: { documentText: 'SSN: 123-45-6789' } }, reply);

      expect(emitSpy).toHaveBeenCalledWith(EVENTS.PII_DETECTED, expect.objectContaining({ type: 'SSN', location: 'document_upload' }));
      expect(DecisionLetterHandler.analyze).toHaveBeenCalledWith(expect.any(String), '[REDACTED]', expect.any(Object));
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ piiRedacted: true }));
    });

    it('passes clean text without redaction', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'clean text', action: 'stripped' as const } as any);
      vi.spyOn(DecisionLetterHandler, 'analyze').mockResolvedValue({ summary: 'Claim granted', nextSteps: [] } as any);

      await handler({ body: { documentText: 'a'.repeat(100) } }, reply);

      expect(DecisionLetterHandler.analyze).toHaveBeenCalledWith(expect.any(String), 'a'.repeat(100), expect.any(Object));
      expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ piiRedacted: false }));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Decision Letter Analysis
  // ───────────────────────────────────────────────────────────────────────────

  describe('Decision Letter Analysis', () => {
    it('returns analysis with summary and next steps', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const mockAnalysis = {
        summary: 'Service connection granted for PTSD',
        rating: 70,
        effectiveDate: '2025-01-01',
        nextSteps: ['Schedule C&P exam', 'Submit additional evidence'],
        issues: [{ condition: 'PTSD', decision: 'granted', rating: 70 }],
      };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'clean', action: 'stripped' as const } as any);
      vi.spyOn(DecisionLetterHandler, 'analyze').mockResolvedValue(mockAnalysis as any);

      await handler({ body: { documentText: 'a'.repeat(200) } }, reply);

      expect(reply.send).toHaveBeenCalledWith({
        summary: 'Service connection granted for PTSD',
        rating: 70,
        effectiveDate: '2025-01-01',
        nextSteps: ['Schedule C&P exam', 'Submit additional evidence'],
        issues: [{ condition: 'PTSD', decision: 'granted', rating: 70 }],
        piiRedacted: false,
      });
    });

    it('generates sessionId when not provided', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'clean', action: 'stripped' as const } as any);
      vi.spyOn(DecisionLetterHandler, 'analyze').mockResolvedValue({ summary: 'Analysis', nextSteps: [] } as any);

      await handler({ body: { documentText: 'a'.repeat(100) } }, reply);

      expect(DecisionLetterHandler.analyze).toHaveBeenCalled();
    });

    it('uses provided sessionId', async () => {
      const mockFastify = createMockFastify();
      await decisionLetterRoute(mockFastify as unknown as Parameters<typeof decisionLetterRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/decision-letter');
      const reply = { send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'a'.repeat(100), action: 'stripped' as const } as any);
      vi.spyOn(DecisionLetterHandler, 'analyze').mockResolvedValue({ summary: 'Analysis', nextSteps: [] } as any);

      await handler({ body: { documentText: 'a'.repeat(100), sessionId: 'custom-session-123' } }, reply);

      expect(DecisionLetterHandler.analyze).toHaveBeenCalledWith('custom-session-123', 'a'.repeat(100), expect.any(Object));
    });
  });
});
