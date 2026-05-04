// destruction.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: DELETE /api/documents/:id/destroy — secure wipe with SSE progress stream

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eventBus, EVENTS } from '@vetassist/events';
import { DataDestructionService } from '@vetassist/ai';
import { EncryptedStorage } from '@vetassist/upload';
import type { DeletionProgress, DataDestructionResult } from '@vetassist/shared-types';

// SSE frame format constants — RFC 8895 compliant
const SSE_CONTENT_TYPE   = 'text/event-stream';
const SSE_CACHE_CONTROL  = 'no-cache';
const SSE_CONNECTION     = 'keep-alive';
const SSE_EVENT_PROGRESS = 'progress';
const SSE_EVENT_DONE     = 'done';
const SSE_EVENT_ERROR    = 'error';

// Zod schema — validates :id param before touching storage
const DestroyParamsSchema = z.object({
  id: z.string().min(1).max(200),
});

const DestroyBodySchema = z.object({
  documentTitle: z.string().min(1).max(500).optional().default('Untitled Document'),
});

// Singleton storage instance — shared with upload route
const storage = new EncryptedStorage();
const destructionService = new DataDestructionService(storage);

export const destructionRoute: FastifyPluginAsync = async (fastify) => {
  // DELETE /api/documents/:id/destroy
  // Streams SSE progress frames, then ends with the deletion certificate as base64 PDF
  fastify.delete<{
    Params: { id: string };
    Body: { documentTitle?: string };
  }>('/documents/:id/destroy', async (request, reply) => {
    const parsedParams = DestroyParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.status(400).send({ error: 'Invalid document ID' });
    }

    const parsedBody = DestroyBodySchema.safeParse(request.body ?? {});
    const documentTitle = parsedBody.success ? parsedBody.data.documentTitle : 'Untitled Document';
    const documentId = parsedParams.data.id;

    // Set SSE headers — must be set before any write
    void reply.raw.writeHead(200, {
      'Content-Type':  SSE_CONTENT_TYPE,
      'Cache-Control': SSE_CACHE_CONTROL,
      'Connection':    SSE_CONNECTION,
    });

    // Subscribe before calling destroy — unsubscribe function returned for cleanup
    const unsubscribe = eventBus.subscribe(EVENTS.DELETION_STEP_PROGRESS, async (payload: DeletionProgress) => {
      if (payload.documentId !== documentId) return;
      writeSSEFrame(reply.raw, SSE_EVENT_PROGRESS, payload);
    });

    try {
      const result: DataDestructionResult = await destructionService.destroy(documentId, documentTitle);
      writeSSEFrame(reply.raw, SSE_EVENT_DONE, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error during destruction.';
      writeSSEFrame(reply.raw, SSE_EVENT_ERROR, { error: message });
    } finally {
      unsubscribe();
      reply.raw.end();
    }
  });
};

// Writes a single SSE frame — event name + JSON data + double newline terminator
function writeSSEFrame(
  raw: import('http').ServerResponse,
  event: string,
  data: unknown,
): void {
  raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
