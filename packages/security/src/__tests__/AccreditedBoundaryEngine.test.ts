// AccreditedBoundaryEngine.test.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Boundary enforcement tests — all access control paths including lifecycle states

import { describe, it, expect } from 'vitest';
import { AccreditedBoundaryEngine } from '../AccreditedBoundaryEngine.js';
import type { AccessRequestContext } from '@vetassist/shared-types';

const FUTURE_DATE = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
const PAST_DATE   = '2020-01-01T00:00:00.000Z';

const ACCREDITED_USER: AccessRequestContext['user'] = {
  id: 'u-001',
  role: 'accredited_representative',
  isAccredited: true,
  accreditation: { status: 'verified', authority: 'VA_OGC', verifiedAt: '2026-01-01T00:00:00Z', expiresAt: FUTURE_DATE },
};

const NON_ACCREDITED_USER: AccessRequestContext['user'] = {
  id: 'u-002',
  role: 'authenticated',
  isAccredited: false,
  accreditation: { status: 'none', authority: 'VA_OGC' },
};

const REVOKED_USER: AccessRequestContext['user'] = {
  id: 'u-003',
  role: 'accredited_representative',
  isAccredited: false,
  accreditation: { status: 'revoked', authority: 'VA_OGC' },
};

const EXPIRED_USER: AccessRequestContext['user'] = {
  id: 'u-004',
  role: 'accredited_representative',
  isAccredited: true,
  accreditation: { status: 'verified', authority: 'VA_OGC', verifiedAt: '2025-01-01T00:00:00Z', expiresAt: PAST_DATE },
};

const PENDING_USER: AccessRequestContext['user'] = {
  id: 'u-005',
  role: 'accredited_representative',
  isAccredited: false,
  accreditation: { status: 'pending', authority: 'VA_OGC' },
};

// AK is in RESTRICTED_STATES — use it for blocked geo tests
const ACCREDITED_USER_RESTRICTED_STATE: AccessRequestContext['user'] = {
  id: 'u-010',
  role: 'accredited_representative',
  state: 'AK',
  isAccredited: true,
  accreditation: { status: 'verified', authority: 'VA_OGC', verifiedAt: '2026-01-01T00:00:00Z', expiresAt: FUTURE_DATE },
};

// CA is NOT in RESTRICTED_STATES — accredited users in CA should be allowed
const ACCREDITED_USER_ALLOWED_STATE: AccessRequestContext['user'] = {
  id: 'u-011',
  role: 'accredited_representative',
  state: 'CA',
  isAccredited: true,
  accreditation: { status: 'verified', authority: 'VA_OGC', verifiedAt: '2026-01-01T00:00:00Z', expiresAt: FUTURE_DATE },
};

// No state field — state check must be skipped entirely
const ACCREDITED_USER_NO_STATE: AccessRequestContext['user'] = {
  id: 'u-012',
  role: 'accredited_representative',
  isAccredited: true,
  accreditation: { status: 'verified', authority: 'VA_OGC', verifiedAt: '2026-01-01T00:00:00Z', expiresAt: FUTURE_DATE },
};

describe('AccreditedBoundaryEngine', () => {
  describe('route policy registry', () => {
    it('returns policy for a known route', () => {
      const policy = AccreditedBoundaryEngine.getRoutePolicy('/api/advisory');
      expect(policy?.requiresAccreditation).toBe(true);
      expect(policy?.riskLevel).toBe('high');
    });

    it('returns policy for a public route', () => {
      const policy = AccreditedBoundaryEngine.getRoutePolicy('/api/chat');
      expect(policy?.requiresAccreditation).toBe(false);
      expect(policy?.riskLevel).toBe('low');
    });

    it('returns undefined for an unknown route', () => {
      expect(AccreditedBoundaryEngine.getRoutePolicy('/api/unknown')).toBeUndefined();
    });
  });

  describe('public routes', () => {
    it('allows any user on a public route regardless of accreditation', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: NON_ACCREDITED_USER,
        accreditedServiceEnabled: false,
        route: '/api/chat',
      });
      expect(result.allowed).toBe(true);
    });

    it('allows any user on an unknown route', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: NON_ACCREDITED_USER,
        accreditedServiceEnabled: true,
        route: '/api/unknown-future-route',
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('accredited routes — feature disabled', () => {
    it('blocks accredited user when feature flag is off', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER,
        accreditedServiceEnabled: false,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not currently available/i);
    });
  });

  describe('accredited routes — feature enabled', () => {
    it('allows verified accredited user', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(true);
    });

    it('blocks non-accredited user', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: NON_ACCREDITED_USER,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
    });

    it('blocks revoked accreditation with specific reason', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: REVOKED_USER,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/revoked/i);
    });

    it('blocks expired accreditation with specific reason', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: EXPIRED_USER,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/expired/i);
    });

    it('blocks pending accreditation with specific reason', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: PENDING_USER,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/pending/i);
    });

    it('blocks admin without verified accreditation — role alone insufficient', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: { id: 'u-006', role: 'admin', isAccredited: false },
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
    });

    it('allows accredited user on /api/claims-assistance', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER,
        accreditedServiceEnabled: true,
        route: '/api/claims-assistance',
      });
      expect(result.allowed).toBe(true);
    });

    it('blocks non-accredited user on /api/strategy', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: NON_ACCREDITED_USER,
        accreditedServiceEnabled: true,
        route: '/api/strategy',
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('accredited routes — state geo-restriction', () => {
    it('blocks fully accredited user in a restricted state', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER_RESTRICTED_STATE,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not yet available in your state/i);
    });

    it('blocks restricted-state user on all three accredited routes', async () => {
      for (const route of ['/api/advisory', '/api/claims-assistance', '/api/strategy']) {
        const result = await AccreditedBoundaryEngine.evaluate({
          user: ACCREDITED_USER_RESTRICTED_STATE,
          accreditedServiceEnabled: true,
          route,
        });
        expect(result.allowed).toBe(false);
      }
    });

    it('allows fully accredited user with no state field', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER_NO_STATE,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(true);
    });

    it('allows fully accredited user in a non-restricted state', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER_ALLOWED_STATE,
        accreditedServiceEnabled: true,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(true);
    });

    it('state restriction does not run on public routes', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER_RESTRICTED_STATE,
        accreditedServiceEnabled: true,
        route: '/api/chat',
      });
      expect(result.allowed).toBe(true);
    });

    it('feature flag blocks before state check — restricted-state user sees flag reason', async () => {
      const result = await AccreditedBoundaryEngine.evaluate({
        user: ACCREDITED_USER_RESTRICTED_STATE,
        accreditedServiceEnabled: false,
        route: '/api/advisory',
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not currently available/i);
    });
  });
});
