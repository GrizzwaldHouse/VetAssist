// claims.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/claims routes test suite — CRUD operations, events, deadlines, checklist

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { claimsRoute } from '../claims.js';
import { ClaimsStore } from '@vetassist/claims';

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
    patch: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'PATCH', url, handler });
    }),
    delete: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'DELETE', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
}

describe('claimsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /claims — List all claims
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /claims', () => {
    it('returns all claims', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.get.mock.calls.find((c) => c[0] === '/claims')?.[2];
      const reply = { send: vi.fn() };
      const mockClaims = [
        { id: 'c1', condition: 'PTSD', status: 'submitted' },
        { id: 'c2', condition: 'Back Pain', status: 'pending_decision' },
      ];
      vi.spyOn(ClaimsStore.prototype, 'listClaims').mockReturnValue(mockClaims as any);

      handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaims);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /claims — Create new claim
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /claims', () => {
    it('creates claim with valid input', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const mockClaim = { id: 'c1', condition: 'PTSD', status: 'not_started', events: [], deadlines: [], checklist: [] };
      vi.spyOn(ClaimsStore.prototype, 'createClaim').mockReturnValue(mockClaim as any);

      handler({ body: { condition: 'PTSD', notes: 'Service-related' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('rejects empty condition', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ body: { condition: '' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects condition exceeding 500 characters', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ body: { condition: 'a'.repeat(501) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('accepts optional notes up to 5000 characters', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      const mockClaim = { id: 'c1', condition: 'PTSD', status: 'not_started', events: [], deadlines: [], checklist: [] };
      vi.spyOn(ClaimsStore.prototype, 'createClaim').mockReturnValue(mockClaim as any);

      handler({ body: { condition: 'PTSD', notes: 'Detailed notes'.repeat(100) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(201);
    });

    it('rejects notes exceeding 5000 characters', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ body: { condition: 'PTSD', notes: 'a'.repeat(5001) } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /claims/:id — Get single claim
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /claims/:id', () => {
    it('returns claim by ID', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.get.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', condition: 'PTSD', status: 'submitted' };
      vi.spyOn(ClaimsStore.prototype, 'getClaim').mockReturnValue(mockClaim as any);

      handler({ params: { id: 'c1' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('returns 404 when claim not found', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.get.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(ClaimsStore.prototype, 'getClaim').mockReturnValue(undefined);

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Claim not found' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PATCH /claims/:id — Update claim
  // ───────────────────────────────────────────────────────────────────────────

  describe('PATCH /claims/:id', () => {
    it('updates claim status', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', condition: 'PTSD', status: 'submitted' };
      vi.spyOn(ClaimsStore.prototype, 'updateClaim').mockReturnValue(mockClaim as any);

      handler({ params: { id: 'c1' }, body: { status: 'submitted' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('updates disability rating', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', condition: 'PTSD', disabilityRating: 70 };
      vi.spyOn(ClaimsStore.prototype, 'updateClaim').mockReturnValue(mockClaim as any);

      handler({ params: { id: 'c1' }, body: { disabilityRating: 70 } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('accepts null disabilityRating', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', condition: 'PTSD', disabilityRating: null };
      vi.spyOn(ClaimsStore.prototype, 'updateClaim').mockReturnValue(mockClaim as any);

      handler({ params: { id: 'c1' }, body: { disabilityRating: null } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('rejects disability rating out of range', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 'c1' }, body: { disabilityRating: 150 } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when claim not found', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(ClaimsStore.prototype, 'updateClaim').mockReturnValue(undefined);

      handler({ params: { id: 'nonexistent' }, body: { status: 'submitted' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Claim not found' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DELETE /claims/:id — Delete claim
  // ───────────────────────────────────────────────────────────────────────────

  describe('DELETE /claims/:id', () => {
    it('deletes claim and returns 204', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.delete.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(ClaimsStore.prototype, 'deleteClaim').mockReturnValue(true);

      handler({ params: { id: 'c1' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(204);
    });

    it('returns 404 when claim not found', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.delete.mock.calls.find((c) => c[0] === '/claims/:id')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(ClaimsStore.prototype, 'deleteClaim').mockReturnValue(false);

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Claim not found' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /claims/:id/events — Add timeline event
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /claims/:id/events', () => {
    it('adds event to claim', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/events')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', events: [{ type: 'claim_created', title: 'Created' }] };
      vi.spyOn(ClaimsStore.prototype, 'addEvent').mockReturnValue(mockClaim as any);

      handler(
        { params: { id: 'c1' }, body: { type: 'claim_created', title: 'Claim filed', description: 'Initial submission' } },
        reply
      );

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('rejects invalid event type', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/events')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        { params: { id: 'c1' }, body: { type: 'invalid_type', title: 'Test', description: 'Test desc' } },
        reply
      );

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects empty title', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/events')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        { params: { id: 'c1' }, body: { type: 'claim_created', title: '', description: 'Test' } },
        reply
      );

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('accepts optional occurredAt datetime', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/events')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', events: [] };
      vi.spyOn(ClaimsStore.prototype, 'addEvent').mockReturnValue(mockClaim as any);

      handler(
        {
          params: { id: 'c1' },
          body: { type: 'claim_created', title: 'Created', description: 'Test', occurredAt: '2026-04-29T10:00:00Z' },
        },
        reply
      );

      expect(reply.send).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /claims/:id/deadlines — Add deadline
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /claims/:id/deadlines', () => {
    it('adds deadline to claim', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/deadlines')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', deadlines: [{ type: 'c_and_p_exam', label: 'Exam', dueAt: '2026-05-01T10:00:00Z' }] };
      vi.spyOn(ClaimsStore.prototype, 'addDeadline').mockReturnValue(mockClaim as any);

      handler(
        {
          params: { id: 'c1' },
          body: { type: 'c_and_p_exam', label: 'C&P Exam', dueAt: '2026-05-01T10:00:00Z' },
        },
        reply
      );

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('accepts optional alertDaysBefore', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/deadlines')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', deadlines: [] };
      vi.spyOn(ClaimsStore.prototype, 'addDeadline').mockReturnValue(mockClaim as any);

      handler(
        {
          params: { id: 'c1' },
          body: { type: 'appeal_deadline', label: 'Appeal', dueAt: '2026-06-01T10:00:00Z', alertDaysBefore: 14 },
        },
        reply
      );

      expect(reply.send).toHaveBeenCalled();
    });

    it('rejects invalid deadline type', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/deadlines')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        { params: { id: 'c1' }, body: { type: 'invalid_type', label: 'Test', dueAt: '2026-05-01T10:00:00Z' } },
        reply
      );

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('rejects missing dueAt', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.post.mock.calls.find((c) => c[0] === '/claims/:id/deadlines')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        { params: { id: 'c1' }, body: { type: 'c_and_p_exam', label: 'Exam' } },
        reply
      );

      expect(reply.status).toHaveBeenCalledWith(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PATCH /claims/:id/checklist — Toggle checklist item
  // ───────────────────────────────────────────────────────────────────────────

  describe('PATCH /claims/:id/checklist', () => {
    it('toggles checklist item to completed', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id/checklist')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', checklist: [{ id: 'item1', label: 'Gather evidence', completed: true }] };
      vi.spyOn(ClaimsStore.prototype, 'toggleChecklistItem').mockReturnValue(mockClaim as any);

      handler({ params: { id: 'c1' }, body: { itemId: 'item1', completed: true } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('toggles checklist item to incomplete', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id/checklist')?.[2];
      const reply = { send: vi.fn() };
      const mockClaim = { id: 'c1', checklist: [{ id: 'item1', label: 'Gather evidence', completed: false }] };
      vi.spyOn(ClaimsStore.prototype, 'toggleChecklistItem').mockReturnValue(mockClaim as any);

      handler({ params: { id: 'c1' }, body: { itemId: 'item1', completed: false } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockClaim);
    });

    it('rejects empty itemId', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id/checklist')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };

      handler({ params: { id: 'c1' }, body: { itemId: '', completed: true } }, reply);

      expect(reply.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when claim not found', async () => {
      const mockFastify = createMockFastify();
      await claimsRoute(mockFastify as unknown as Parameters<typeof claimsRoute>[0]);
      const handler = mockFastify.patch.mock.calls.find((c) => c[0] === '/claims/:id/checklist')?.[2];
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(ClaimsStore.prototype, 'toggleChecklistItem').mockReturnValue(undefined);

      handler({ params: { id: 'nonexistent' }, body: { itemId: 'item1', completed: true } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Claim not found' });
    });
  });
});
