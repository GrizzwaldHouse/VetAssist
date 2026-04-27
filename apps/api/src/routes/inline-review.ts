// inline-review.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: /api/documents/review/inline — PII-gated inline diff review with per-span suggestions

import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UserInput, InlineReviewResult } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { InlineDiffHandler, createProvider, createPromptLoader } from '@vetassist/ai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_BASE_PATH = path.resolve(__dirname, '../../../../claude/skills');

const DOC_TEXT_MIN = 10;
const DOC_TEXT_MAX = 20_000;
const SCORING_MODES = ['encouraging', 'strict'] as const;
type ScoringMode = typeof SCORING_MODES[number];

const InlineReviewSchema = z.object({
  text: z.string().min(DOC_TEXT_MIN).max(DOC_TEXT_MAX),
  scoringMode: z.enum(SCORING_MODES).optional().default('encouraging'),
  sessionId: z.string().uuid().optional(),
});

type InlineReviewBody = z.infer<typeof InlineReviewSchema>;

const provider = createProvider(process.env['CLAUDE_API_KEY']);
const promptLoader = createPromptLoader(SKILLS_BASE_PATH);

export const inlineReviewRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: InlineReviewBody; Reply: InlineReviewResult }>(
    '/documents/review/inline',
    {
      schema: {
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: DOC_TEXT_MIN, maxLength: DOC_TEXT_MAX },
            scoringMode: { type: 'string', enum: [...SCORING_MODES] },
            sessionId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = InlineReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: parsed.error.flatten(),
        } as unknown as InlineReviewResult);
      }

      const { text, scoringMode, sessionId: incoming } = parsed.data;
      const sessionId = incoming ?? randomUUID();

      const input: UserInput = {
        sessionId,
        userId: null,
        text,
        timestamp: new Date().toISOString(),
        source: 'document_upload',
      };

      await eventBus.emit(EVENTS.USER_INPUT_RECEIVED, input);

      // PII gate — block if raw SSN or credit card detected before any AI call
      const piiResult = await PIIDetector.scanAndEmit(input, 'document_upload');
      if (piiResult.hasPII) {
        return reply.code(422).send({
          error: `PII detected: ${piiResult.detectedTypes.join(', ')}. Remove sensitive data before reviewing.`,
        } as unknown as InlineReviewResult);
      }

      // Crisis gate — document text may surface distress signals
      const crisisResult = await CrisisDetector.detectAndEmit(input);
      if (crisisResult.isCrisis) {
        return reply.code(200).send({
          sessionId,
          overall: 0,
          mode: scoringMode as ScoringMode,
          categories: [],
          diffs: [],
          crisisDetected: true,
        } as unknown as InlineReviewResult);
      }

      try {
        const result = await InlineDiffHandler.review(
          sessionId,
          piiResult.sanitizedText,
          scoringMode as ScoringMode,
          { provider, promptLoader },
        );

        return reply.send(result);
      } catch (err: unknown) {
        const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';
        fastify.log.error({ errorType }, '[documents/review/inline] AI provider error');
        return reply.code(500).send({
          error: 'Inline review failed. Please try again.',
        } as unknown as InlineReviewResult);
      }
    },
  );
};
