// chat.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: /api/chat route — emits USER_INPUT_RECEIVED, runs PII, crisis, AI pipeline

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { UserInput } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { ChatPipeline, createProvider } from '@vetassist/ai';
import { retrievalPipeline } from '@vetassist/knowledge';

const ChatRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

interface ChatResponse {
  sessionId: string;
  text: string;
  citations: readonly string[];
  compliancePassed: boolean;
  isCrisis: boolean;
}

const provider = createProvider(process.env['CLAUDE_API_KEY']);

export const chatRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: ChatRequest; Reply: ChatResponse }>(
    '/chat',
    {
      schema: {
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 4000 },
            sessionId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = ChatRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid request', details: parsed.error.flatten() } as unknown as ChatResponse);
      }

      const { text, userId } = parsed.data;
      const sessionId = parsed.data.sessionId ?? randomUUID();

      const input: UserInput = {
        sessionId,
        userId: userId ?? null,
        text,
        timestamp: new Date().toISOString(),
        source: 'chat',
      };

      await eventBus.emit(EVENTS.USER_INPUT_RECEIVED, input);

      // Layer 1: PII check — blocks if PII found
      const piiResult = await PIIDetector.scanAndEmit(input, 'text_input');
      if (piiResult.hasPII) {
        return reply.code(422).send({
          sessionId,
          text: `Your message appears to contain sensitive information (${piiResult.detectedTypes.join(', ')}). Please remove it before sending. Your information has not been transmitted.`,
          citations: [],
          compliancePassed: false,
          isCrisis: false,
        } as ChatResponse);
      }

      // Layer 2: Crisis check — returns crisis response immediately
      const crisisResult = await CrisisDetector.detectAndEmit(input);
      if (crisisResult.isCrisis) {
        return reply.send({
          sessionId,
          text: CrisisDetector.getCrisisResponseText(),
          citations: [],
          compliancePassed: true,
          isCrisis: true,
        });
      }

      // Layer 3: AI pipeline — legal boundary + compliance gate inside
      const result = await ChatPipeline.run(input, piiResult.sanitizedText, {
        provider,
        contextChunksFetcher: (q) => retrievalPipeline.retrieveContext(q),
      });

      return reply.send({
        sessionId: result.sessionId,
        text: result.responseText,
        citations: result.citations,
        compliancePassed: result.compliancePassed,
        isCrisis: false,
      });
    },
  );
};
