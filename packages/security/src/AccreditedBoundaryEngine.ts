// AccreditedBoundaryEngine.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Route-level access control — policy registry, accreditation lifecycle enforcement, audit emit

import type {
  AccessRequestContext,
  AccessDecision,
  RoutePolicy,
  ComplianceAuditLog,
} from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { RESTRICTED_STATES } from '@vetassist/shared-config';

// Central policy registry — single place to add, remove, or reclassify routes.
// Never hardcode route strings inside evaluate() logic.
const ROUTE_POLICIES: Readonly<Record<string, RoutePolicy>> = {
  '/api/chat':               { requiresAccreditation: false, riskLevel: 'low' },
  '/api/documents/review':   { requiresAccreditation: false, riskLevel: 'low' },
  '/api/documents/upload':   { requiresAccreditation: false, riskLevel: 'low' },
  '/api/documents/generate': { requiresAccreditation: false, riskLevel: 'low' },
  '/api/documents/share':    { requiresAccreditation: false, riskLevel: 'medium' },
  '/api/benefits':           { requiresAccreditation: false, riskLevel: 'low' },
  '/api/claims':             { requiresAccreditation: false, riskLevel: 'medium' },
  '/api/community/stories':  { requiresAccreditation: false, riskLevel: 'low' },
  '/api/decision-letter':    { requiresAccreditation: false, riskLevel: 'medium' },
  '/api/advisory':           { requiresAccreditation: true,  riskLevel: 'high' },
  '/api/claims-assistance':  { requiresAccreditation: true,  riskLevel: 'high' },
  '/api/strategy':           { requiresAccreditation: true,  riskLevel: 'high' },
};

// Expiry check — a verified accreditation that has passed its expiresAt is treated as expired
function isAccreditationActive(user: AccessRequestContext['user']): boolean {
  if (!user.isAccredited) return false;
  if (!user.accreditation) return false;
  if (user.accreditation.status !== 'verified') return false;
  if (user.accreditation.expiresAt) {
    if (new Date(user.accreditation.expiresAt) < new Date()) return false;
  }
  return true;
}

function buildAuditLog(
  userId: string,
  route: string,
  decision: 'allowed' | 'blocked',
  reason: string,
): ComplianceAuditLog {
  return {
    userId,
    route,
    decision,
    reason,
    timestamp: new Date().toISOString(),
  };
}

async function evaluate(context: AccessRequestContext): Promise<AccessDecision> {
  const { user, accreditedServiceEnabled, route } = context;
  const policy = ROUTE_POLICIES[route];

  // Routes not in the registry are treated as public — unknown routes don't silently require accreditation
  if (!policy || !policy.requiresAccreditation) {
    const log = buildAuditLog(user.id, route, 'allowed', 'Public route');
    await eventBus.emit(EVENTS.ACCESS_EVALUATED, log);
    return { allowed: true };
  }

  // Fail-fast: feature flag gates the entire accredited layer
  if (!accreditedServiceEnabled) {
    const log = buildAuditLog(user.id, route, 'blocked', 'Accredited services are not currently available');
    await eventBus.emit(EVENTS.ACCESS_EVALUATED, log);
    return { allowed: false, reason: log.reason };
  }

  // Accreditation lifecycle check — covers revoked, expired, pending, and missing
  if (!isAccreditationActive(user)) {
    const status = user.accreditation?.status ?? 'none';
    const isExpired = status === 'verified' &&
      !!user.accreditation?.expiresAt &&
      new Date(user.accreditation.expiresAt) < new Date();
    const reason =
      status === 'revoked'  ? 'Accreditation has been revoked' :
      isExpired             ? 'Accreditation has expired — renewal required' :
      status === 'pending'  ? 'Accreditation is pending verification' :
                              'Access requires a verified VA-accredited representative account';

    const log = buildAuditLog(user.id, route, 'blocked', reason);
    await eventBus.emit(EVENTS.ACCESS_EVALUATED, log);
    return { allowed: false, reason };
  }

  // State geo-restriction — only enforced when user.state is present
  // Absent state is a pass-through: restriction is opt-in by state, not opt-out when unknown
  if (user.state && RESTRICTED_STATES.has(user.state)) {
    const reason = 'Service not yet available in your state';
    const log = buildAuditLog(user.id, route, 'blocked', reason);
    await eventBus.emit(EVENTS.ACCESS_EVALUATED, log);
    return { allowed: false, reason };
  }

  const log = buildAuditLog(user.id, route, 'allowed', 'Accreditation verified');
  await eventBus.emit(EVENTS.ACCESS_EVALUATED, log);
  return { allowed: true };
}

// Read-only policy lookup — lets tests and monitoring inspect the registry without mutation
function getRoutePolicy(route: string): RoutePolicy | undefined {
  return ROUTE_POLICIES[route];
}

export const AccreditedBoundaryEngine = { evaluate, getRoutePolicy } as const;
