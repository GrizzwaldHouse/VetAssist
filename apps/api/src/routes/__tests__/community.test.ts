// community.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/community routes test suite — story submission, moderation, upvotes, reports

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { communityRoute } from '../community.js';
import { CrisisDetector } from '@vetassist/crisis';
import { PIIDetector } from '@vetassist/pii';
import * as ModerationModule from '@vetassist/moderation';
import * as CommunityModule from '@vetassist/community';
const { moderateContent, enqueue, listQueue } = ModerationModule;
const { createStory, listStories, upvoteStory, getStoryById } = CommunityModule;
import { StoryBuilderHandler } from '@vetassist/ai';
import { eventBus, EVENTS } from '@vetassist/events';

// ─────────────────────────────────────────────────────────────────────────────
// Test helper: create a mock Fastify instance
// ─────────────────────────────────────────────────────────────────────────────

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  return {
    get: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'GET', url, handler });
    }),
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
}

function getHandler(
  mock: ReturnType<typeof createMockFastify>,
  method: 'get' | 'post',
  url: string
): (req: unknown, reply: unknown) => unknown {
  const calls = (mock[method] as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown, unknown]>;
  const match = calls.find((c) => c[0] === url);
  if (!match) throw new Error(`No handler registered for ${method.toUpperCase()} ${url}`);
  return match[2] as (req: unknown, reply: unknown) => unknown;
}

describe('communityRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /community/stories — Submit story
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /community/stories', () => {
    it('rejects story with title too short', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { title: 'Hi', content: 'a'.repeat(50), category: 'general' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects story with content too short', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { title: 'My Story', content: 'Short', category: 'general' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid category', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      await handler({ body: { title: 'My Story', content: 'a'.repeat(50), category: 'invalid' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('detects crisis content and returns crisis response', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: true, matchedPhrases: ['kill myself'], confidence: 0.9, tier: 1 as const });

      await handler({ body: { title: 'My Story', content: 'I want to kill myself', category: 'general' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'crisis',
          message: expect.stringContaining('988'),
        })
      );
      expect(emitSpy).toHaveBeenCalledWith(EVENTS.CRISIS_DETECTED, expect.any(Object));
    });

    it('sanitizes PII from story content', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const emitSpy = vi.spyOn(eventBus, 'emit');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: true, detectedTypes: ['SSN'], sanitizedText: 'My SSN is [REDACTED]', action: 'blocked' as const } as any);
      vi.spyOn(StoryBuilderHandler.prototype, 'extractTips').mockResolvedValue([]);
      vi.spyOn(ModerationModule, 'moderateContent').mockReturnValue({ action: 'approved', requiresAdminReview: false, flags: [], toxicityScore: 0 } as any);
      const mockStory = { id: 's1', title: 'My Story', content: 'My SSN is [REDACTED]', status: 'approved' };
      vi.spyOn(CommunityModule, 'createStory').mockReturnValue(mockStory as any);

      await handler({ body: { title: 'My Story', content: 'My SSN is 123-45-6789', category: 'general' } }, reply);

      expect(emitSpy).toHaveBeenCalledWith(EVENTS.PII_DETECTED, expect.objectContaining({ type: 'SSN' }));
      expect(CommunityModule.createStory).toHaveBeenCalledWith(expect.objectContaining({ content: 'My SSN is [REDACTED]' }));
    });

    it('returns approved status for clean content', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'clean content', action: 'stripped' as const } as any);
      vi.spyOn(StoryBuilderHandler.prototype, 'extractTips').mockResolvedValue([{ tip: 'Great story' }] as any);
      vi.spyOn(ModerationModule, 'moderateContent').mockReturnValue({ action: 'approved', requiresAdminReview: false, flags: [], toxicityScore: 0 } as any);
      const mockStory = { id: 's1', title: 'My Story', content: 'clean content', status: 'approved', tips: [{ tip: 'Great story' }] };
      vi.spyOn(CommunityModule, 'createStory').mockReturnValue(mockStory as any);

      await handler({ body: { title: 'My Story', content: 'a'.repeat(100), category: 'general' } }, reply);

      expect(reply.send).toHaveBeenCalledWith({ status: 'approved', story: mockStory });
    });

    it('returns pending status for flagged content', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'content', action: 'stripped' as const } as any);
      vi.spyOn(ModerationModule, 'moderateContent').mockReturnValue({ action: 'pending', requiresAdminReview: true, flags: ['toxicity'], toxicityScore: 0.8 } as any);
      const mockStory = { id: 's1', title: 'My Story', content: 'content', status: 'pending', tips: [] };
      vi.spyOn(CommunityModule, 'createStory').mockReturnValue(mockStory as any);
      vi.spyOn(StoryBuilderHandler.prototype, 'extractTips').mockResolvedValue([]);

      await handler({ body: { title: 'My Story', content: 'a'.repeat(100), category: 'general' } }, reply);

      expect(reply.send).toHaveBeenCalledWith({ status: 'pending', story: mockStory });
    });

    it('adds story to mod queue when flagged', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const enqueueSpy = vi.spyOn(ModerationModule, 'enqueue');

      vi.spyOn(CrisisDetector, 'detectCrisis').mockResolvedValue({ isCrisis: false, matchedPhrases: [], confidence: 0, tier: 0 as const });
      vi.spyOn(PIIDetector, 'scan').mockReturnValue({ hasPII: false, detectedTypes: [], sanitizedText: 'content', action: 'stripped' as const } as any);
      vi.spyOn(ModerationModule, 'moderateContent').mockReturnValue({ action: 'pending', requiresAdminReview: true, flags: ['toxicity'], toxicityScore: 0.8 } as any);
      const mockStory = { id: 's1', title: 'My Story', content: 'content', status: 'pending', tips: [] };
      vi.spyOn(CommunityModule, 'createStory').mockReturnValue(mockStory as any);
      vi.spyOn(StoryBuilderHandler.prototype, 'extractTips').mockResolvedValue([]);

      await handler({ body: { title: 'My Story', content: 'a'.repeat(100), category: 'general' } }, reply);

      expect(enqueueSpy).toHaveBeenCalledWith('s1', 'My Story', ['toxicity'], 0.8);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /community/stories — List stories
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /community/stories', () => {
    it('returns approved stories', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/community/stories');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const mockStories = [{ id: 's1', title: 'Story 1', status: 'approved' }];
      vi.spyOn(CommunityModule, 'listStories').mockReturnValue(mockStories as any);

      handler({ query: {} }, reply);

      expect(reply.send).toHaveBeenCalledWith({ stories: mockStories, total: 1 });
      expect(CommunityModule.listStories).toHaveBeenCalledWith({ status: 'approved', category: undefined, branch: undefined });
    });

    it('filters by category', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/community/stories');
      const reply = { send: vi.fn() };
      vi.spyOn(CommunityModule, 'listStories').mockReturnValue([]);

      handler({ query: { category: 'cp_exam' } }, reply);

      expect(CommunityModule.listStories).toHaveBeenCalledWith({ status: 'approved', category: 'cp_exam', branch: undefined });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /community/stories/:id — Single story
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /community/stories/:id', () => {
    it('returns approved story by ID', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/community/stories/:id');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const mockStory = { id: 's1', title: 'Story 1', status: 'approved' };
      vi.spyOn(CommunityModule, 'getStoryById').mockReturnValue(mockStory as any);

      handler({ params: { id: 's1' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockStory);
    });

    it('returns 404 for non-existent story', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/community/stories/:id');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'getStoryById').mockReturnValue(null as any);

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Story not found.' });
    });

    it('returns 404 for pending story', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/community/stories/:id');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'getStoryById').mockReturnValue({ id: 's1', status: 'pending' } as any);

      handler({ params: { id: 's1' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /community/stories/:id/upvote — Upvote story
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /community/stories/:id/upvote', () => {
    it('increments upvote count', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories/:id/upvote');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'upvoteStory').mockReturnValue({ id: 's1', upvotes: 10 } as any);

      handler({ params: { id: 's1' } }, reply);

      expect(reply.send).toHaveBeenCalledWith({ upvotes: 10 });
    });

    it('returns 404 for non-existent story', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories/:id/upvote');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'upvoteStory').mockReturnValue(null as any);

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Story not found.' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /community/stories/:id/report — Report story
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /community/stories/:id/report', () => {
    it('accepts report with optional reason', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories/:id/report');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'getStoryById').mockReturnValue({ id: 's1' } as any);

      handler({ params: { id: 's1' }, body: { reason: 'Inappropriate content' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Report received') })
      );
    });

    it('accepts report without reason', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories/:id/report');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'getStoryById').mockReturnValue({ id: 's1' } as any);

      handler({ params: { id: 's1' }, body: {} }, reply);

      expect(reply.send).toHaveBeenCalled();
    });

    it('rejects invalid report request', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories/:id/report');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 's1' }, body: { reason: 'a'.repeat(201) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 for non-existent story', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/community/stories/:id/report');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(CommunityModule, 'getStoryById').mockReturnValue(null as any);

      handler({ params: { id: 'nonexistent' }, body: {} }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /community/admin/queue — Admin moderation queue
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /community/admin/queue', () => {
    it('returns moderation queue', async () => {
      const mockFastify = createMockFastify();
      await communityRoute(mockFastify as unknown as Parameters<typeof communityRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/community/admin/queue');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const mockQueue = [{ id: 's1', title: 'Flagged Story', flags: ['toxicity'] }];
      vi.spyOn(ModerationModule, 'listQueue').mockReturnValue(mockQueue as any);

      handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith({ queue: mockQueue, total: 1 });
    });
  });
});
