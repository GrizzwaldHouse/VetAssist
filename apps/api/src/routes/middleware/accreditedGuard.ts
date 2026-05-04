// accreditedGuard.ts
// Developer: Marcus Daley
// Date: 2026-05-03
// Purpose: Fastify preHandler hook — blocks non-accredited callers from advisory routes

import type { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

const ACCREDITED_HEADER = 'x-vetassist-accredited';

export function accreditedGuard(
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction
): void {
  const token = request.headers[ACCREDITED_HEADER];
  if (!token || token !== process.env.ACCREDITED_GUARD_TOKEN) {
    reply.code(403).send({ error: 'Accredited access required' });
    return;
  }
  done();
}
