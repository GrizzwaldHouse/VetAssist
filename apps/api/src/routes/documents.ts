// documents.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: /api/documents/review route — PII-guarded document scoring with CFR alignment

import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UserInput, ScoreResult } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { DocumentReviewHandler, createProvider, createPromptLoader } from '@vetassist/ai';

// Resolve path to claude/skills/ from apps/api/ — two levels up to project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_BASE_PATH = path.resolve(__dirname, '../../../../claude/skills');

// Document text length limits — prevents token-budget abuse
const DOC_TEXT_MIN = 1;
const DOC_TEXT_MAX = 20_000;

// Valid scoring mode values
const SCORING_MODES = ['encouraging', 'strict'] as const;
type ScoringMode = typeof SCORING_MODES[number];

const DocumentReviewSchema = z.object({
  text: z.string().min(DOC_TEXT_MIN).max(DOC_TEXT_MAX),
  scoringMode: z.enum(SCORING_MODES).optional().default('encouraging'),
  sessionId: z.string().optional(),
});

type DocumentReviewBody = z.infer<typeof DocumentReviewSchema>;

const provider = createProvider(process.env['CLAUDE_API_KEY']);
const promptLoader = createPromptLoader(SKILLS_BASE_PATH);

export const documentsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: DocumentReviewBody; Reply: ScoreResult }>(
    '/documents/review',
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
      const parsed = DocumentReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid request', details: parsed.error.flatten() } as unknown as ScoreResult);
      }

      const { text, scoringMode, sessionId: incomingSessionId } = parsed.data;
      const sessionId = incomingSessionId ?? randomUUID();

      const input: UserInput = {
        sessionId,
        userId: null,
        text,
        timestamp: new Date().toISOString(),
        source: 'document_upload',
      };

      await eventBus.emit(EVENTS.USER_INPUT_RECEIVED, input);

      // Layer 1: PII gate — document_upload location for audit log specificity
      const piiResult = await PIIDetector.scanAndEmit(input, 'document_upload');
      if (piiResult.hasPII) {
        return reply.code(422).send({
          error: `Your document appears to contain sensitive information (${piiResult.detectedTypes.join(', ')}). Please remove it before submitting. No data was transmitted.`,
        } as unknown as ScoreResult);
      }

      // Layer 2: Crisis check — document text may surface distress signals
      const crisisResult = await CrisisDetector.detectAndEmit(input);
      if (crisisResult.isCrisis) {
        return reply.code(200).send({
          overall: 0,
          mode: scoringMode as ScoringMode,
          categories: [],
          suggestions: [],
          crisisDetected: true,
          crisisText: CrisisDetector.getCrisisResponseText(),
        } as unknown as ScoreResult);
      }

      // Layer 3: AI document review — legal boundary + CFR scoring inside handler
      try {
        const scoreResult = await DocumentReviewHandler.review(
          sessionId,
          piiResult.sanitizedText,
          scoringMode as ScoringMode,
          { provider, promptLoader },
        );

        return reply.send(scoreResult);
      } catch (err: unknown) {
        // Log error type only — never log document content (may contain PII not caught by regex)
        const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';
        fastify.log?.error({ errorType }, '[documents/review] AI provider error');
        return reply.code(500).send({ error: 'Document review failed. Please try again.' } as unknown as ScoreResult);
      }
    },
  );
};
