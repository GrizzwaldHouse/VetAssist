// faq-glossary.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: FAQ, Glossary, and Workarounds routes test suite — search, filter, pagination

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faqGlossaryRoute } from '../faq-glossary.js';

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

describe('faqGlossaryRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/faq — Paginated FAQ list
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /faq', () => {
    it('returns paginated FAQs with defaults', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: {} }, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          entries: expect.any(Array),
          total: expect.any(Number),
          page: 1,
          pageSize: 20,
        })
      );
    });

    it('filters FAQs by category', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq');
      const reply = { send: vi.fn() };

      handler({ query: { category: 'claims' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.entries.forEach((entry: any) => {
        expect(entry.category).toBe('claims');
      });
    });

    it('searches FAQs by keyword', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq');
      const reply = { send: vi.fn() };

      handler({ query: { q: 'rating' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.entries.forEach((entry: any) => {
        expect(
          entry.question.toLowerCase().includes('rating') ||
          entry.answer.toLowerCase().includes('rating')
        ).toBe(true);
      });
    });

    it('supports pagination with page and pageSize', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq');
      const reply = { send: vi.fn() };

      handler({ query: { page: 2, pageSize: 5 } }, reply);

      const result = reply.send.mock.calls[0][0];
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(5);
      expect(result.entries.length).toBeLessThanOrEqual(5);
    });

    it('rejects invalid category', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { category: 'invalid' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects pageSize over 100', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { pageSize: 101 } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/faq/search — Full-text FAQ search
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /faq/search', () => {
    it('returns matching FAQs for search term', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq/search');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { q: 'ITF' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(expect.any(Array));
    });

    it('returns empty array for no matches', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq/search');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { q: 'xyznonexistent' } }, reply);

      expect(reply.send).toHaveBeenCalledWith([]);
    });

    it('rejects empty search query', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq/search');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { q: '' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects query over 200 characters', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/faq/search');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { q: 'a'.repeat(201) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/faq/:id/upvote — Upvote FAQ
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /faq/:id/upvote', () => {
    it('returns upvote count for existing FAQ', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/faq/:id/upvote');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 'faq-001' } }, reply);

      expect(reply.send).toHaveBeenCalledWith({ id: 'faq-001', upvotes: 1 });
    });

    it('returns 404 for non-existent FAQ', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/faq/:id/upvote');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ message: 'FAQ entry not found' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/glossary — All glossary terms
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /glossary', () => {
    it('returns all glossary terms sorted alphabetically', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          terms: expect.any(Array),
          total: expect.any(Number),
        })
      );
      const result = reply.send.mock.calls[0][0];
      const terms = result.terms.map((t: any) => t.term);
      expect(terms).toEqual([...terms].sort());
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/glossary/search — Glossary search
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /glossary/search', () => {
    it('returns matching terms for search query', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary/search');
      const reply = { send: vi.fn() };

      handler({ query: { q: 'disability' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(expect.any(Array));
    });

    it('searches term, definition, and acronym', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary/search');
      const reply = { send: vi.fn() };

      handler({ query: { q: 'PTSD' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.forEach((term: any) => {
        expect(
          term.term.toLowerCase().includes('ptsd') ||
          term.definition.toLowerCase().includes('ptsd') ||
          term.acronym?.toLowerCase().includes('ptsd')
        ).toBe(true);
      });
    });

    it('rejects empty search query', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary/search');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ query: { q: '' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/glossary/letter/:letter — Terms by letter
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /glossary/letter/:letter', () => {
    it('returns terms starting with specified letter', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary/letter/:letter');
      const reply = { send: vi.fn() };

      handler({ params: { letter: 'd' } }, reply);

      const result = reply.send.mock.calls[0][0];
      result.forEach((term: any) => {
        expect(term.term.toLowerCase().startsWith('d')).toBe(true);
      });
    });

    it('rejects invalid letter parameter', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary/letter/:letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { letter: '12' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects non-alphabetic letter', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/glossary/letter/:letter');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { letter: '@' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/workarounds — VA website workaround guides
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /workarounds', () => {
    it('returns all workaround guides', async () => {
      const mockFastify = createMockFastify();
      await faqGlossaryRoute(mockFastify as unknown as Parameters<typeof faqGlossaryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/workarounds');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith(expect.any(Array));
    });
  });
});
