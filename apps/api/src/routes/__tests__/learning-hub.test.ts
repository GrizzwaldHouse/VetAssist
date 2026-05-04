// learning-hub.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/learning routes test suite — list, filter, and retrieve learning resources

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { learningHubRoute } from '../learning-hub.js';

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  return {
    get: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'GET', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
}

function getHandler(
  mock: ReturnType<typeof createMockFastify>,
  method: 'get',
  url: string
): (req: unknown, reply: unknown) => unknown {
  const calls = (mock[method] as ReturnType<typeof vi.fn>).mock.calls as Array<[string, unknown, unknown]>;
  const match = calls.find((c) => c[0] === url);
  if (!match) throw new Error(`No handler registered for ${method.toUpperCase()} ${url}`);
  return match[2] as (req: unknown, reply: unknown) => unknown;
}

describe('learningHubRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /learning', () => {
    it('returns all learning resources', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: {} }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          resources: expect.any(Array),
          totalCount: expect.any(Number),
        })
      );
    });

    it('filters by topic', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { send: vi.fn() };

      handler({ query: { topic: 'disability_compensation' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.resources.forEach((r: any) => {
        expect(r.topic).toBe('disability_compensation');
      });
    });

    it('filters by type', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { send: vi.fn() };

      handler({ query: { type: 'video' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.resources.forEach((r: any) => {
        expect(r.type).toBe('video');
      });
    });

    it('filters by difficulty level', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { send: vi.fn() };

      handler({ query: { difficulty: 'beginner' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.resources.forEach((r: any) => {
        expect(r.difficultyLevel).toBe('beginner');
      });
    });

    it('searches by keyword in title, description, and keyTakeaways', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { send: vi.fn() };

      handler({ query: { q: 'disability' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.resources.forEach((r: any) => {
        expect(
          r.title.toLowerCase().includes('disability') ||
          r.description.toLowerCase().includes('disability') ||
          r.keyTakeaways.some((t: string) => t.toLowerCase().includes('disability'))
        ).toBe(true);
      });
    });

    it('rejects invalid topic', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { topic: 'invalid' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects invalid type', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { type: 'podcast' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects query over 200 characters', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { q: 'a'.repeat(201) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /learning/:id', () => {
    it('returns resource by ID', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning/:id');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 'lr-001' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'lr-001' })
      );
    });

    it('returns 404 for non-existent resource', async () => {
      const mockFastify = createMockFastify();
      await learningHubRoute(mockFastify as unknown as Parameters<typeof learningHubRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/learning/:id');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Resource not found' });
    });
  });
});
