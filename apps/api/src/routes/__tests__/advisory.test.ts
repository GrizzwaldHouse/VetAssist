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

describe('advisoryRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Accredited Guard Middleware', () => {
    it('registers preHandler hook with accreditedGuard', async () => {
      const mockFastify = createMockFastify();
      await advisoryRoute(mockFastify as unknown as Parameters<typeof advisoryRoute>[0], {} as any);

      const hooks = mockFastify.getHooks();
      const preHandlerHook = hooks.find((h) => h.name === 'preHandler');

      expect(preHandlerHook).toBeDefined();
      expect((preHandlerHook?.handler as Function).name).toBe('accreditedGuard');
    });
  });

  describe('POST /advisory', () => {
    it('returns not yet implemented message', async () => {
      const mockFastify = createMockFastify();
      await advisoryRoute(mockFastify as unknown as Parameters<typeof advisoryRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/advisory');
      const reply = { send: vi.fn() };

      await handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith({ message: 'Accredited advisory endpoint — not yet implemented' });
    });
  });
});
