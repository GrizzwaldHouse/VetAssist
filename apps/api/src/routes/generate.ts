// generate.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: POST /api/documents/generate — wizard-driven VA document generation with PII/crisis gates

import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { UserInput, GeneratedDocument, WizardDocType } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CrisisDetector } from '@vetassist/crisis';
import { DocumentWriterHandler, createProvider, createPromptLoader } from '@vetassist/ai';

// Resolve path to claude/skills/ from apps/api/ — two levels up to project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_BASE_PATH = path.resolve(__dirname, '../../../../claude/skills');

// Valid document types
const WIZARD_DOC_TYPES = [
  'buddy_letter',
  'personal_statement',
  'stressor_statement',
  'nexus_evidence_package',
] as const;

// Valid scoring modes
const SCORING_MODES = ['encouraging', 'strict'] as const;

const GenerateDocumentSchema = z.object({
  docType: z.enum(WIZARD_DOC_TYPES),
  answers: z.record(z.string(), z.string()).refine(obj => Object.keys(obj).length > 0, { message: 'answers must not be empty' }),
  scoringMode: z.enum(SCORING_MODES).default('encouraging'),
  sessionId: z.string().optional(),
});

type GenerateDocumentBody = z.infer<typeof GenerateDocumentSchema>;

const provider = createProvider(process.env['CLAUDE_API_KEY']);
const promptLoader = createPromptLoader(SKILLS_BASE_PATH);

export const generateRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: GenerateDocumentBody; Reply: GeneratedDocument }>(
    '/documents/generate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['docType', 'answers'],
          properties: {
            docType: { type: 'string', enum: [...WIZARD_DOC_TYPES] },
            answers: { type: 'object', additionalProperties: { type: 'string' } },
            scoringMode: { type: 'string', enum: [...SCORING_MODES] },
            sessionId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const parsed = GenerateDocumentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: parsed.error.flatten(),
        } as unknown as GeneratedDocument);
      }

      const { docType, answers, scoringMode, sessionId: incomingSessionId } = parsed.data;
      const sessionId = incomingSessionId ?? randomUUID();

      // Serialize answers to a single string for PII and crisis scanning
      const answersText = JSON.stringify(answers);

      const input: UserInput = {
        sessionId,
        userId: null,
        text: answersText,
        timestamp: new Date().toISOString(),
        source: 'document_upload',
      };

      await eventBus.emit(EVENTS.USER_INPUT_RECEIVED, input);

      // Layer 1: PII gate — scan serialized answers before any AI processing
      const piiResult = await PIIDetector.scanAndEmit(input, 'document_upload');
      if (piiResult.hasPII) {
        return reply.code(422).send({
          error: `Your answers appear to contain sensitive information (${piiResult.detectedTypes.join(', ')}). Please remove it before submitting. No data was transmitted.`,
        } as unknown as GeneratedDocument);
      }

      // Layer 2: Crisis gate — detect distress signals in answers before generation
      const crisisResult = await CrisisDetector.detectAndEmit(input);
      if (crisisResult.isCrisis) {
        return reply.code(200).send({
          sessionId,
          docType,
          title: '',
          content: '',
          disclaimer: '',
          score: { overall: 0, mode: scoringMode, categories: [], suggestions: [] },
          generatedAt: new Date().toISOString(),
          crisisDetected: true,
          crisisText: CrisisDetector.getCrisisResponseText(),
        } as unknown as GeneratedDocument);
      }

      // Layer 3: Generate document via DocumentWriterHandler
      try {
        const generatedDoc = await DocumentWriterHandler.generate(
          sessionId,
          docType as WizardDocType,
          answers,
          scoringMode,
          { provider, promptLoader },
        );

        // Emit DOCUMENT_GENERATED event for cross-system observability
        await eventBus.emit(EVENTS.DOCUMENT_GENERATED, {
          sessionId,
          docType,
        });

        return reply.send(generatedDoc);
      } catch (err: unknown) {
        // Log error type only — never log answers (may contain PII not caught by regex)
        const errorType = err instanceof Error ? err.constructor.name : 'UnknownError';
        fastify.log?.error({ errorType }, '[documents/generate] AI provider error');
        return reply.code(500).send({
          error: 'Document generation failed. Please try again.',
        } as unknown as GeneratedDocument);
      }
    },
  );
};
