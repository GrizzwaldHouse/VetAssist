// generate.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/documents/generate route test suite — wizard-driven document generation with PII/crisis gates

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateRoute } from '../generate.js';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { DocumentWriterHandler } from '@vetassist/ai';
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

describe('generateRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Input Validation', () => {
    it('rejects invalid docType', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { docType: 'invalid', answers: {} } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects empty answers object', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { docType: 'buddy_letter', answers: {} } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('accepts valid scoringMode', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: '{}', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentWriterHandler, 'generate').mockResolvedValue({ sessionId: 's1', docType: 'buddy_letter', title: 'Buddy Letter', content: 'Generated', disclaimer: '', score: { overall: 80, mode: 'strict', categories: [], suggestions: [] }, generatedAt: new Date().toISOString() } as any);

      await handler({ body: { docType: 'buddy_letter', answers: { q1: 'a1' }, scoringMode: 'strict' } }, reply);

      expect(reply.send).toHaveBeenCalled();
    });

    it('rejects invalid scoringMode', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { docType: 'buddy_letter', answers: { q1: 'a1' }, scoringMode: 'invalid' } }, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('PII Detection', () => {
    it('blocks generation when PII detected in answers', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: true, detectedTypes: ['SSN'], sanitizedText: '[REDACTED]', action: 'blocked' as const });

      await handler({ body: { docType: 'buddy_letter', answers: { ssn: '123-45-6789' } } }, reply);

      expect(reply.code).toHaveBeenCalledWith(422);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('sensitive information') })
      );
    });
  });

  describe('Crisis Detection', () => {
    it('returns crisis response when distress detected in answers', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: 'test', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: true, matchedPhrases: ['end my life'], confidence: 1, tier: 1 as const });
      vi.spyOn(CrisisDetector, 'getCrisisResponseText').mockReturnValue('Call 988');

      await handler({ body: { docType: 'personal_statement', answers: { mood: 'I want to end my life' } } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ crisisDetected: true, crisisText: 'Call 988' })
      );
    });
  });

  describe('Document Generation', () => {
    it('generates buddy letter with score', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { send: vi.fn() };
      const mockDoc = {
        sessionId: 's1', docType: 'buddy_letter', title: 'Buddy Letter',
        content: 'Generated content', disclaimer: '',
        score: { overall: 85, mode: 'encouraging', categories: [], suggestions: [] },
        generatedAt: new Date().toISOString(),
      };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: '{}', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentWriterHandler, 'generate').mockResolvedValue(mockDoc as any);

      await handler({ body: { docType: 'buddy_letter', answers: { relationship: 'friend', observations: 'PTSD symptoms' } } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockDoc);
    });

    it('emits DOCUMENT_GENERATED event on success', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: '{}', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentWriterHandler, 'generate').mockResolvedValue({ sessionId: 's1', docType: 'buddy_letter', title: '', content: '', disclaimer: '', score: { overall: 80, mode: 'encouraging', categories: [], suggestions: [] }, generatedAt: new Date().toISOString() } as any);

      await handler({ body: { docType: 'buddy_letter', answers: { q1: 'a1' } } }, reply);

      expect(emitSpy).toHaveBeenCalledWith(EVENTS.DOCUMENT_GENERATED, expect.objectContaining({ docType: 'buddy_letter' }));
    });

    it('returns 500 when generation fails', async () => {
      const mockFastify = createMockFastify();
      await generateRoute(mockFastify as unknown as Parameters<typeof generateRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/documents/generate');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({ hasPII: false, detectedTypes: [], sanitizedText: '{}', action: 'stripped' as const });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(DocumentWriterHandler, 'generate').mockRejectedValue(new Error('API error'));

      await handler({ body: { docType: 'buddy_letter', answers: { q1: 'a1' } } }, reply);

      expect(reply.code).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Document generation failed. Please try again.' })
      );
    });
  });
});
