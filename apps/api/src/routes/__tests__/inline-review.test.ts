// inline-review.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/documents/review/inline route test suite — diff-based review with per-span suggestions

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inlineReviewRoute } from '../inline-review.js';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { InlineDiffHandler } from '@vetassist/ai';
import { eventBus, EVENTS } from '@vetassist/events';

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  return {
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
}

describe('inlineReviewRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('rejects text under 10 characters', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { text: 'short' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects text exceeding 20000 characters', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { text: 'a'.repeat(20001) } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects invalid scoringMode', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { text: 'a'.repeat(20), scoringMode: 'invalid' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('PII Detection', () => {
    it('blocks review when PII detected', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: true, detectedTypes: ['SSN'], sanitizedText: '[REDACTED]' });

      await handler({ body: { text: 'My SSN is 123-45-6789' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(422);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('PII detected') })
      );
    });
  });

  describe('Crisis Detection', () => {
    it('returns crisis response when distress detected', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test' });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: true, matchedPhrases: ['kill myself'] });

      await handler({ body: { text: 'I want to kill myself' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ crisisDetected: true, overall: 0 })
      );
    });
  });

  describe('Inline Review', () => {
    it('returns diff-based review with suggestions', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { send: vi.fn() };
      const mockResult = {
        sessionId: 's1', overall: 75, mode: 'encouraging',
        categories: [{ name: 'Evidence', score: 80 }],
        diffs: [
          { span: { start: 0, end: 10 }, original: 'weak text', suggestion: 'stronger text', reason: 'Be more specific' },
        ],
      };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test' });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(InlineDiffHandler, 'review').mockResolvedValue(mockResult as any);

      await handler({ body: { text: 'a'.repeat(50) } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockResult);
    });

    it('uses strict scoring mode when requested', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test' });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(InlineDiffHandler, 'review').mockResolvedValue({ sessionId: 's1', overall: 60, mode: 'strict', categories: [], diffs: [] } as any);

      await handler({ body: { text: 'a'.repeat(50), scoringMode: 'strict' } }, reply);

      expect(InlineDiffHandler.review).toHaveBeenCalledWith(expect.any(String), 'test', 'strict', expect.any(Object));
    });

    it('returns 500 when review fails', async () => {
      const mockFastify = createMockFastify();
      await inlineReviewRoute(mockFastify as unknown as Parameters<typeof inlineReviewRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/documents/review/inline')?.[2];
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test' });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [] });
      vi.spyOn(InlineDiffHandler, 'review').mockRejectedValue(new Error('API error'));

      await handler({ body: { text: 'a'.repeat(50) } }, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Inline review failed. Please try again.' })
      );
    });
  });
});
