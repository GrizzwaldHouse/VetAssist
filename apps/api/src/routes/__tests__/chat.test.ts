// chat.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/chat route test suite — validates input, PII blocking, crisis detection, AI response

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatRoute } from '../chat.js';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { ChatPipeline } from '@vetassist/ai';
import { eventBus, EVENTS } from '@vetassist/events';

// ─────────────────────────────────────────────────────────────────────────────
// Test helper: create a mock Fastify instance
// ─────────────────────────────────────────────────────────────────────────────

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  const instance = {
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
  return instance;
}

function getHandler(
  mock: ReturnType<typeof createMockFastify>,
  url: string
): (req: unknown, reply: unknown) => unknown {
  const calls = mock.post.mock.calls as Array<[string, unknown, unknown]>;
  const match = calls.find((c) => c[0] === url);
  if (!match) throw new Error(`No handler registered for POST ${url}`);
  return match[2] as (req: unknown, reply: unknown) => unknown;
}

describe('chatRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Input Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Input Validation', () => {
    it('rejects empty text', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(
        { body: { text: '' } },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects text exceeding 4000 characters', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler(
        { body: { text: 'a'.repeat(4001) } },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('accepts valid sessionId as UUID', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: false,
        detectedTypes: [],
        sanitizedText: 'hello',
        action: 'stripped' as const,
      });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({
        isCrisis: false,
        confidence: 0,
        matchedPhrases: [],
        tier: 0 as const,
      });
      vi.spyOn(ChatPipeline, 'run').mockResolvedValue({
        sessionId: 'test-session',
        responseText: 'Hello',
        citations: [],
        compliancePassed: true,
      });

      await handler(
        { body: { text: 'hello', sessionId: '550e8400-e29b-41d4-a716-446655440000' } },
        reply
      );

      expect(reply.send).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PII Detection — Blocks messages containing sensitive info
  // ───────────────────────────────────────────────────────────────────────────

  describe('PII Detection', () => {
    it('blocks message with SSN and returns 422', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: true,
        detectedTypes: ['SSN'],
        sanitizedText: 'My SSN is [REDACTED]',
        action: 'blocked' as const,
      });

      await handler(
        { body: { text: 'My SSN is 123-45-6789' } },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(422);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('sensitive information'),
          isCrisis: false,
        })
      );
    });

    it('blocks message with VA file number and returns 422', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: true,
        detectedTypes: ['VA_FILE_NUMBER'],
        sanitizedText: 'file [REDACTED]',
        action: 'blocked' as const,
      });

      await handler(
        { body: { text: 'My VA file is C1234567' } },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(422);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('sensitive information'),
        })
      );
    });

    it('blocks message with credit card number and returns 422', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: true,
        detectedTypes: ['CREDIT_CARD'],
        sanitizedText: 'card [REDACTED]',
        action: 'blocked' as const,
      });

      await handler(
        { body: { text: 'My card is 4111111111111111' } },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(422);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Crisis Detection — Returns crisis response immediately
  // ───────────────────────────────────────────────────────────────────────────

  describe('Crisis Detection', () => {
    it('detects suicide ideation and returns crisis response', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: false,
        detectedTypes: [],
        sanitizedText: 'I want to kill myself',
        action: 'stripped' as const,
      });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({
        isCrisis: true,
        confidence: 1,
        matchedPhrases: ['kill myself'],
        tier: 1 as const,
      });
      vi.spyOn(CrisisDetector, 'getCrisisResponseText').mockReturnValue(
        'If you are in crisis, please call 988'
      );

      await handler(
        { body: { text: 'I want to kill myself' } },
        reply
      );

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'If you are in crisis, please call 988',
          isCrisis: true,
          compliancePassed: true,
        })
      );
    });

    it('does not trigger crisis for non-crisis frustration', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: false,
        detectedTypes: [],
        sanitizedText: "I don't see the point in filing online",
        action: 'stripped' as const,
      });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({
        isCrisis: false,
        confidence: 0,
        matchedPhrases: [],
        tier: 0 as const,
      });
      vi.spyOn(ChatPipeline, 'run').mockResolvedValue({
        sessionId: 'test-session',
        responseText: 'I understand your frustration',
        citations: [],
        compliancePassed: true,
      });

      await handler(
        { body: { text: "I don't see the point in filing online" } },
        reply
      );

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          isCrisis: false,
          text: 'I understand your frustration',
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AI Pipeline — Successful response flow
  // ───────────────────────────────────────────────────────────────────────────

  describe('AI Pipeline', () => {
    it('returns AI response with citations for clean input', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: false,
        detectedTypes: [],
        sanitizedText: 'What benefits am I eligible for?',
        action: 'stripped' as const,
      });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({
        isCrisis: false,
        confidence: 0,
        matchedPhrases: [],
        tier: 0 as const,
      });
      vi.spyOn(ChatPipeline, 'run').mockResolvedValue({
        sessionId: 'test-session',
        responseText: 'You may be eligible for several benefits',
        citations: ['38 CFR § 3.303'],
        compliancePassed: true,
      });

      await handler(
        { body: { text: 'What benefits am I eligible for?' } },
        reply
      );

      expect(reply.send).toHaveBeenCalledWith({
        sessionId: 'test-session',
        text: 'You may be eligible for several benefits',
        citations: ['38 CFR § 3.303'],
        compliancePassed: true,
        isCrisis: false,
      });
    });

    it('generates new sessionId when not provided', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: false,
        detectedTypes: [],
        sanitizedText: 'hello',
        action: 'stripped' as const,
      });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({
        isCrisis: false,
        confidence: 0,
        matchedPhrases: [],
        tier: 0 as const,
      });
      vi.spyOn(ChatPipeline, 'run').mockResolvedValue({
        sessionId: 'generated-uuid',
        responseText: 'Hi there',
        citations: [],
        compliancePassed: true,
      });

      await handler(
        { body: { text: 'hello' } },
        reply
      );

      expect(ChatPipeline.run).toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Event Emission — Verifies event bus integration
  // ───────────────────────────────────────────────────────────────────────────

  describe('Event Emission', () => {
    it('emits USER_INPUT_RECEIVED event before processing', async () => {
      const mockFastify = createMockFastify();
      await chatRoute(mockFastify as unknown as Parameters<typeof chatRoute>[0], {} as any);
      const handler = getHandler(mockFastify, '/chat');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(PIIDetector, 'scanAndEmit').mockResolvedValue({
        hasPII: false,
        detectedTypes: [],
        sanitizedText: 'test',
        action: 'stripped' as const,
      });
      vi.spyOn(CrisisDetector, 'detectAndEmit').mockResolvedValue({
        isCrisis: false,
        confidence: 0,
        matchedPhrases: [],
        tier: 0 as const,
      });
      vi.spyOn(ChatPipeline, 'run').mockResolvedValue({
        sessionId: 'test',
        responseText: 'ok',
        citations: [],
        compliancePassed: true,
      });

      await handler(
        { body: { text: 'test', sessionId: 'session-1' } },
        reply
      );

      expect(emitSpy).toHaveBeenCalledWith(
        EVENTS.USER_INPUT_RECEIVED,
        expect.objectContaining({
          sessionId: 'session-1',
          text: 'test',
          source: 'chat',
        })
      );
    });
  });
});
