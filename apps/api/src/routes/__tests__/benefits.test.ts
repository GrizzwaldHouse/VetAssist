// benefits.test.ts
// Developer: Marcus Daley
// Date: 2026-04-29
// Purpose: /api/benefits routes test suite — search, eligibility, hidden gems, benefit lookup

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { benefitsRoute } from '../benefits.js';
import { BenefitsService, EligibilityChecker } from '@vetassist/benefits';

// ─────────────────────────────────────────────────────────────────────────────
// Test helper: create a mock Fastify instance
// ─────────────────────────────────────────────────────────────────────────────

function createMockFastify() {
  const routes: Array<{ method: string; url: string; handler: unknown }> = [];
  const instance = {
    get: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'GET', url, handler });
    }),
    post: vi.fn((url: string, _opts: unknown, handler: unknown) => {
      routes.push({ method: 'POST', url, handler });
    }),
    getRegisteredRoutes: () => routes,
  };
  return instance;
}

// Returns the registered handler for a given method+url as a typed callable.
function getHandler(
  mock: ReturnType<typeof createMockFastify>,
  method: 'get' | 'post',
  url: string
): (req: unknown, reply: unknown) => unknown {
  const calls = mock[method].mock.calls as Array<[string, unknown, unknown]>;
  const match = calls.find((c) => c[0] === url);
  if (!match) throw new Error(`No handler registered for ${method.toUpperCase()} ${url}`);
  return match[2] as (req: unknown, reply: unknown) => unknown;
}

describe('benefitsRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/benefits — Search and filter
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /benefits', () => {
    it('returns all benefits when no query params provided', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits');
      const reply = { send: vi.fn() };
      const mockBenefits = [{ id: 'b1', name: 'Healthcare' }, { id: 'b2', name: 'Education' }];
      vi.spyOn(BenefitsService.prototype, 'search').mockReturnValue(mockBenefits as any);

      handler({ query: {} }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockBenefits);
    });

    it('searches by query string', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits');
      const reply = { send: vi.fn() };
      const searchSpy = vi.spyOn(BenefitsService.prototype, 'search').mockReturnValue([]);

      handler({ query: { q: 'education', category: 'all' } }, reply);

      expect(searchSpy).toHaveBeenCalledWith('education', 'all', undefined);
    });

    it('filters by category', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits');
      const reply = { send: vi.fn() };
      const searchSpy = vi.spyOn(BenefitsService.prototype, 'search').mockReturnValue([]);

      handler({ query: { q: '', category: 'healthcare' } }, reply);

      expect(searchSpy).toHaveBeenCalledWith('', 'healthcare', undefined);
    });

    it('filters by state code', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits');
      const reply = { send: vi.fn() };
      const searchSpy = vi.spyOn(BenefitsService.prototype, 'search').mockReturnValue([]);

      handler({ query: { q: '', state: 'CA' } }, reply);

      expect(searchSpy).toHaveBeenCalledWith('', 'all', 'CA');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/benefits/hidden-gems — Curated lesser-known benefits
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /benefits/hidden-gems', () => {
    it('returns curated hidden gems', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits/hidden-gems');
      const reply = { send: vi.fn() };
      const hiddenGems = [{ id: 'gem1', name: 'Hidden Benefit 1' }];
      vi.spyOn(BenefitsService.prototype, 'getHiddenGems').mockReturnValue(hiddenGems as any);

      handler({}, reply);

      expect(reply.send).toHaveBeenCalledWith(hiddenGems);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET /api/benefits/:id — Single benefit lookup
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /benefits/:id', () => {
    it('returns benefit by ID', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits/:id');
      const reply = { send: vi.fn() };
      const mockBenefit = { id: 'b1', name: 'Healthcare', category: 'healthcare' };
      vi.spyOn(BenefitsService.prototype, 'getById').mockReturnValue(mockBenefit as any);

      handler({ params: { id: 'b1' } }, reply);

      expect(reply.send).toHaveBeenCalledWith(mockBenefit);
    });

    it('returns 404 when benefit not found', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'get', '/benefits/:id');
      const reply = { status: vi.fn().mockReturnThis(), send: vi.fn() };
      vi.spyOn(BenefitsService.prototype, 'getById').mockReturnValue(null as any);

      handler({ params: { id: 'nonexistent' } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ message: 'Benefit not found' });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /api/benefits/eligibility — Rule-based eligibility check
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /benefits/eligibility', () => {
    it('returns eligibility results for valid input', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/benefits/eligibility');
      const reply = { send: vi.fn() };
      const mockResult = {
        eligibleBenefits: ['b1', 'b2'],
        ineligibleBenefits: ['b3'],
        reasons: { b1: 'Meets service requirement', b3: 'Requires 10 years service' },
      };
      vi.spyOn(EligibilityChecker.prototype, 'check').mockReturnValue(mockResult as any);

      handler(
        {
          body: {
            veteranStatus: 'veteran',
            dischargeType: 'honorable',
            serviceYears: 5,
            disabilityRating: 50,
            stateCode: 'CA',
            hasServiceConnectedCondition: true,
          },
        },
        reply
      );

      expect(reply.send).toHaveBeenCalledWith(mockResult);
    });

    it('rejects invalid veteran status', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/benefits/eligibility');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        {
          body: {
            veteranStatus: 'invalid_status',
            dischargeType: 'honorable',
            serviceYears: 5,
            disabilityRating: 50,
            stateCode: 'CA',
            hasServiceConnectedCondition: true,
          },
        },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects invalid disability rating (out of range)', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/benefits/eligibility');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        {
          body: {
            veteranStatus: 'veteran',
            dischargeType: 'honorable',
            serviceYears: 5,
            disabilityRating: 150,
            stateCode: 'CA',
            hasServiceConnectedCondition: true,
          },
        },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('rejects invalid state code (not 2 chars)', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/benefits/eligibility');
      const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };

      handler(
        {
          body: {
            veteranStatus: 'veteran',
            dischargeType: 'honorable',
            serviceYears: 5,
            disabilityRating: 50,
            stateCode: 'CAL',
            hasServiceConnectedCondition: true,
          },
        },
        reply
      );

      expect(reply.code).toHaveBeenCalledWith(400);
    });

    it('accepts null stateCode for non-US veterans', async () => {
      const mockFastify = createMockFastify();
      await benefitsRoute(mockFastify as unknown as Parameters<typeof benefitsRoute>[0], {} as any);
      const handler = getHandler(mockFastify, 'post', '/benefits/eligibility');
      const reply = { send: vi.fn() };
      const mockResult = { eligibleBenefits: [], ineligibleBenefits: [], reasons: {} };
      vi.spyOn(EligibilityChecker.prototype, 'check').mockReturnValue(mockResult as any);

      handler(
        {
          body: {
            veteranStatus: 'veteran',
            dischargeType: 'honorable',
            serviceYears: 5,
            disabilityRating: 50,
            stateCode: null,
            hasServiceConnectedCondition: false,
          },
        },
        reply
      );

      expect(reply.send).toHaveBeenCalled();
    });
  });
});
