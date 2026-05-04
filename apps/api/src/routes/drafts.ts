// drafts.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: In-memory draft storage route — persists offline document drafts server-side on reconnect

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PIIDetector } from '@vetassist/pii';

// In-memory store — same MVP pattern as other routes; keyed by draft key string
const draftsStore = new Map<string, string>();

// Zod schema — validates every incoming save-draft body before touching the store
const SaveDraftBodySchema = z.object({
  key:     z.string().min(1).max(500),
  content: z.string().min(0).max(100_000),
});

// Standard not-found body — consistent shape across all 404 responses in the codebase
const NOT_FOUND_BODY = { error: 'Draft not found' } as const;

export const draftsRoute: FastifyPluginAsync = async (fastify) => {
  // POST /documents/drafts — PII-scrub content, then upsert under the given key
  fastify.post('/documents/drafts', async (request, reply) => {
    const parsed = SaveDraftBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { key, content } = parsed.data;

    // Run PII scrub before storing — SSNs and other PII must never reach the store
    const piiResult = PIIDetector.scan(content);
    draftsStore.set(key, piiResult.sanitizedText);

    return reply.status(200).send({ status: 'saved', key });
  });

  // GET /documents/drafts/:key — retrieve a stored draft by its key
  fastify.get<{ Params: { key: string } }>('/documents/drafts/:key', async (request, reply) => {
    const { key } = request.params;
    const content = draftsStore.get(key);

    if (content === undefined) {
      return reply.status(404).send(NOT_FOUND_BODY);
    }

    return reply.status(200).send({ key, content });
  });

  // DELETE /documents/drafts/:key — remove a draft; 204 regardless of prior existence for idempotency
  fastify.delete<{ Params: { key: string } }>('/documents/drafts/:key', async (request, reply) => {
    const { key } = request.params;

    if (!draftsStore.has(key)) {
      return reply.status(404).send(NOT_FOUND_BODY);
    }

    draftsStore.delete(key);
    return reply.status(204).send();
  });
};
