// accreditedGuard.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Fastify preHandler — blocks accredited routes before route logic executes

import type { FastifyReply, FastifyRequest } from 'fastify';
import { AccreditedBoundaryEngine } from '@vetassist/security';
import { FeatureFlags } from '@vetassist/shared-config';
import type { UserContext } from '@vetassist/shared-types';

export async function accreditedGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Auth middleware is responsible for attaching request.user — guard fails closed if absent
  const user = (request as FastifyRequest & { user?: UserContext }).user;

  if (!user) {
    await reply.code(401).send({ error: 'UNAUTHENTICATED', reason: 'Authentication required' });
    return;
  }

  const decision = await AccreditedBoundaryEngine.evaluate({
    user,
    accreditedServiceEnabled: FeatureFlags.accreditedServiceEnabled,
    route: request.routerPath,
  });

  if (!decision.allowed) {
    await reply.code(403).send({ error: 'ACCESS_DENIED', reason: decision.reason });
  }
}
