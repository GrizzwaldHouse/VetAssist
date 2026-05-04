// advisory.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Accredited advisory routes — isolated scope, accreditedGuard runs on every handler

import type { FastifyPluginAsync } from 'fastify';
import { accreditedGuard } from '../middleware/accreditedGuard.js';

export const advisoryRoute: FastifyPluginAsync = async (fastify) => {
  // All routes in this plugin require accreditation — guard fires before any handler
  fastify.addHook('preHandler', accreditedGuard);

  fastify.post('/advisory', async (_request, reply) => {
    // Placeholder — accredited advisory logic goes here when the layer is formally enabled
    return reply.send({ message: 'Accredited advisory endpoint — not yet implemented' });
  });
};
