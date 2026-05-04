// decision-letter.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: POST /api/documents/decision-letter — VA decision letter analysis with PII/crisis gates

import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { DecisionLetterHandler, createProvider, createPromptLoader } from '@vetassist/ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_BASE_PATH = path.resolve(__dirname, '../../../../claude/skills');

const DecisionLetterBodySchema = z.object({
  documentText: z.string().min(10).max(50_000),
  sessionId:    z.string().optional(),
});

export const decisionLetterRoute: FastifyPluginAsync = async (fastify) => {
  const provider     = createProvider();
  const promptLoader = createPromptLoader(SKILLS_BASE_PATH);

  fastify.post('/documents/decision-letter', {}, async (request, reply) => {
    const parsed = DecisionLetterBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid request', errors: parsed.error.issues });
    }

    const { documentText, sessionId } = parsed.data;
    const sid = sessionId ?? randomUUID();

    // Crisis gate — decision letters may contain distressing language
    const crisisResult = await CrisisDetector.detectCrisis(documentText);
    if (crisisResult.isCrisis) {
      eventBus.emit(EVENTS.CRISIS_DETECTED, { sessionId: sid, result: crisisResult });
      return reply.status(200).send({
        crisisDetected: true,
        message: 'We noticed some concerning content. Please reach out to the Veterans Crisis Line: 988 (Press 1).',
      });
    }

    // PII scrub — SSNs/addresses redacted before sending to AI
    const piiResult = PIIDetector.scan(documentText);
    if (piiResult.hasPII) {
      eventBus.emit(EVENTS.PII_DETECTED, {
        eventId: randomUUID(), type: 'SSN', location: 'document_upload',
        action: 'redacted', timestamp: new Date().toISOString(), detectionLayer: 'server_presidio',
      });
    }

    const safeText = piiResult.hasPII ? piiResult.sanitizedText : documentText;

    const analysis = await DecisionLetterHandler.analyze(sid, safeText, { provider, promptLoader });

    return reply.send({ ...analysis, piiRedacted: piiResult.hasPII });
  });
};
