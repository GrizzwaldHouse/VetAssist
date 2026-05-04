// documents.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/documents/review route test suite — PII gate, crisis detection, AI scoring

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentsRoute } from '../documents.js';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { DocumentReviewHandler } from '@vetassist/ai';
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

describe('documentsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Input Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Input Validation', () => {
    it('rejects empty document text', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { text: '' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects text exceeding 20000 characters', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { text: 'a'.repeat(20001) } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('accepts valid scoringMode', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentReviewHandler, 'review').mockResolvedValue({ overall: 75, mode: 'encouraging', categories: [], suggestions: [] } as any);

      await handler({ body: { text: 'test document', scoringMode: 'strict' } }, reply);

      expect(DocumentReviewHandler.review).toHaveBeenCalled();
    });

    it('rejects invalid scoringMode', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { text: 'test', scoringMode: 'invalid' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PII Detection — Blocks documents containing sensitive info
  // ───────────────────────────────────────────────────────────────────────────

  describe('PII Detection', () => {
    it('blocks document with SSN and returns 422', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: true,
        detectedTypes: ['SSN'],
        sanitizedText: '[REDACTED]',
        action: 'blocked' as const,
      });

      await handler({ body: { text: 'My SSN is 123-45-6789' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(422);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('sensitive information'),
        })
      );
    });

    it('blocks document with VA file number and returns 422', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: true,
        detectedTypes: ['VA_FILE_NUMBER'],
        sanitizedText: '[REDACTED]',
        action: 'blocked' as const,
      });

      await handler({ body: { text: 'VA file C1234567' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(422);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Crisis Detection — Returns crisis response for distress signals
  // ───────────────────────────────────────────────────────────────────────────

  describe('Crisis Detection', () => {
    it('detects crisis in document and returns crisis response', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: true, matchedPhrases: ['end my life'], confidence: 1, tier: 1 as const });
      vi.spyOn(CrisisDetector, 'getCrisisResponseText').mockReturnValue('If you are in crisis, call 988');

      await handler({ body: { text: 'I want to end my life' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          crisisDetected: true,
          crisisText: 'If you are in crisis, call 988',
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AI Document Review — Successful scoring flow
  // ───────────────────────────────────────────────────────────────────────────

  describe('AI Document Review', () => {
    it('returns document score with categories and suggestions', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentReviewHandler, 'review').mockResolvedValue({
        overall: 85,
        mode: 'encouraging',
        categories: [{ name: 'Evidence', score: 90 }, { name: 'Nexus', score: 80 }],
        suggestions: ['Add more medical evidence', 'Strengthen nexus statement'],
      } as any);

      await handler({ body: { text: 'My claim statement with evidence' } }, reply);

      expect(reply.send).toHaveBeenCalledWith({
        overall: 85,
        mode: 'encouraging',
        categories: [{ name: 'Evidence', score: 90 }, { name: 'Nexus', score: 80 }],
        suggestions: ['Add more medical evidence', 'Strengthen nexus statement'],
      });
    });

    it('uses strict scoring mode when requested', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentReviewHandler, 'review').mockResolvedValue({
        overall: 60,
        mode: 'strict',
        categories: [],
        suggestions: [],
      } as any);

      await handler({ body: { text: 'test', scoringMode: 'strict' } }, reply);

      expect(DocumentReviewHandler.review).toHaveBeenCalledWith(
        expect.any(String),
        'test',
        'strict',
        expect.any(Object)
      );
    });

    it('generates sessionId when not provided', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentReviewHandler, 'review').mockResolvedValue({
        overall: 75,
        mode: 'encouraging',
        categories: [],
        suggestions: [],
      } as any);

      await handler({ body: { text: 'test' } }, reply);

      expect(DocumentReviewHandler.review).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling — AI provider failures
  // ───────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('returns 500 when AI provider fails', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentReviewHandler, 'review').mockRejectedValue(new Error('API error'));

      await handler({ body: { text: 'test' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Document review failed. Please try again.',
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Event Emission — Verifies event bus integration
  // ───────────────────────────────────────────────────────────────────────────

  describe('Event Emission', () => {
    it('emits USER_INPUT_RECEIVED event before processing', async () => {
      const mockFastify = createMockFastify();
      await documentsRoute(mockFastify as unknown as Parameters<typeof documentsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/review');
      const reply = { send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentReviewHandler, 'review').mockResolvedValue({
        overall: 75,
        mode: 'encouraging',
        categories: [],
        suggestions: [],
      } as any);

      await handler({ body: { text: 'test', sessionId: 'doc-session-1' } }, reply);

      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.USER_INPUT_RECEIVED,
        expect.objectContaining({
          sessionId: 'doc-session-1',
          source: 'document_upload',
        })
      );
    });
  });
});
