// sharing.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: POST /api/documents/share — PII-rescanned direct document sharing (email/SMS/download)

import { randomUUID } from 'crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { ShareRequest } from '@vetassist/shared-types';
import { SharingService } from '@vetassist/ai';
import { eventBus, EVENTS } from '@vetassist/events';
import { CrisisDetector } from '@vetassist/crisis';

// Valid share channels — no temporary URLs per project config
const SHARE_CHANNELS = ['email', 'sms', 'download'] as const;

const ShareBodySchema = z.object({
  documentContent: z.string().min(1).max(50_000),
  documentTitle:   z.string().min(1).max(200),
  channel:         z.enum(SHARE_CHANNELS),
  // recipient required for email/sms, absent for download
  recipient:       z.string().max(320).nullable().optional(),
  sessionId:       z.string().optional(),
});

export const sharingRoute: FastifyPluginAsync = async (fastify) => {
  const sharingService = new SharingService();

  fastify.post('/documents/share', async (request, reply) => {
    const parsed = ShareBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid request', errors: parsed.error.issues });
    }

    const { documentContent, documentTitle, channel, recipient, sessionId } = parsed.data;
    const sid = sessionId ?? randomUUID();

    // Crisis gate — sharing must not bypass safety check
    const crisisResult = CrisisDetector.detectCrisis(documentContent);
    if (crisisResult.isCrisis) {
      eventBus.emit(EVENTS.CRISIS_DETECTED, { sessionId: sid, result: crisisResult });
      return reply.status(200).send({
        success:        false,
        channel,
        piiRescanned:   false,
        piiFound:       false,
        downloadPayload: null,
        message:        'Sharing paused — please reach out to the Veterans Crisis Line: 988 (Press 1)',
        sharedAt:       new Date().toISOString(),
      });
    }

    const shareRequest: ShareRequest = {
      documentContent,
      documentTitle,
      channel,
      recipient: recipient ?? null,
      sessionId: sid,
    };

    const result = await sharingService.share(shareRequest);

    // Log PII detection event without storing the value
    if (result.piiFound) {
      eventBus.emit(EVENTS.PII_DETECTED, {
        eventId:        randomUUID(),
        type:           'SSN',
        location:       'document_upload',
        action:         'redacted',
        timestamp:      new Date().toISOString(),
        detectionLayer: 'server_presidio',
      });
    }

    return reply.status(200).send(result);
  });
};
