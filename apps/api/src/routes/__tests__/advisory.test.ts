// advisory.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/advisory route test suite — accredited guard middleware

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { advisoryRoute } from '../advisory.js';
import { accreditedGuard } from '../middleware/accreditedGuard.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test helper: create a mock Fastify instance
// ─────────────────────────────────────────────────────────────────────────────

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  const hooks: Array<{ name: string; handler: unknown }> = [];
  return {
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    addHook: vi.fn((name: string, handler: unknown) => {
      hooks.push({ name, handler });
    }),
    getRegisteredRoutes: () => routes,
    getHooks: () => hooks,
  };
}

describe('advisoryRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Accredited Guard Middleware', () => {
    it('registers preHandler hook with accreditedGuard', async () => {
      const mockFastify = createMockFastify();
      await advisoryRoute(mockFastify as unknown as Parameters<typeof advisoryRoute>[0]);

      const hooks = mockFastify.getHooks();
      const preHandlerHook = hooks.find((h) => h.name === 'preHandler');

      expect(preHandlerHook).toBeDefined();
      expect(preHandlerHook?.handler).toBe(accreditedGuard);
    });
  });

  describe('POST /advisory', () => {
    it('returns not yet implemented message', async () => {
      const mockFastify = createMockFastify();
      await advisoryRoute(mockFastify as unknown as Parameters<typeof advisoryRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/advisory')?.[2];
      const reply = { send: vi.fn() };

      await handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith({ message: 'Accredited advisory endpoint — not yet implemented' });
    });
  });
});
