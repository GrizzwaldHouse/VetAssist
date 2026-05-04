// benefits.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: /api/benefits routes — search, detail, hidden gems, and eligibility check

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BenefitsService, EligibilityChecker } from '@vetassist/benefits';
import type { BenefitV2, EligibilityAnswers, EligibilityResult } from '@vetassist/shared-types';

const BENEFIT_NOT_FOUND_MSG = 'Benefit not found';

const BENEFIT_CATEGORIES = [
  'all',
  'healthcare',
  'education',
  'housing',
  'employment',
  'compensation',
  'pension',
  'insurance',
  'burial',
  'family',
  'transition',
] as const;

const SearchQuerySchema = z.object({
  q: z.string().optional().default(''),
  category: z.enum(BENEFIT_CATEGORIES).optional().default('all'),
  state: z.string().length(2).optional(),
});

const EligibilitySchema = z.object({
  veteranStatus: z.enum(['active', 'veteran', 'guard_reserve', 'survivor']),
  dischargeType: z.enum([
    'honorable',
    'general',
    'other_than_honorable',
    'bad_conduct',
    'dishonorable',
    'unknown',
  ]),
  serviceYears: z.number().min(0).max(50),
  disabilityRating: z.number().min(0).max(100),
  stateCode: z.string().length(2).nullable(),
  hasServiceConnectedCondition: z.boolean(),
});

const benefitsService = new BenefitsService();
const eligibilityChecker = new EligibilityChecker();

export const benefitsRoute: FastifyPluginAsync = async (fastify) => {
  // GET /api/benefits — search and filter benefits
  fastify.get<{ Querystring: z.infer<typeof SearchQuerySchema>; Reply: readonly BenefitV2[] }>(
    '/benefits',
    {},
    async (request, reply) => {
      const result = SearchQuerySchema.safeParse(request.query);
      if (!result.success) return reply.code(400).send({ error: 'Invalid request', details: result.error.issues } as unknown as readonly BenefitV2[]);
      const parsed = result.data;
      const results = benefitsService.search(
        parsed.q,
        parsed.category as BenefitV2['category'] | 'all',
        parsed.state,
      );
      return reply.send(results);
    },
  );

  // GET /api/benefits/hidden-gems — return curated lesser-known benefits
  fastify.get<{ Reply: readonly BenefitV2[] }>(
    '/benefits/hidden-gems',
    {},
    async (_request, reply) => {
      return reply.send(benefitsService.getHiddenGems());
    },
  );

  // GET /api/benefits/:id — single benefit by ID
  fastify.get<{ Params: { id: string }; Reply: BenefitV2 }>(
    '/benefits/:id',
    {},
    async (request, reply) => {
      const benefit = benefitsService.getById(request.params.id);
      if (!benefit) {
        return reply.status(404).send({ message: BENEFIT_NOT_FOUND_MSG } as unknown as BenefitV2);
      }
      return reply.send(benefit);
    },
  );

  // POST /api/benefits/eligibility — rule-based eligibility check against veteran profile
  fastify.post<{ Body: z.infer<typeof EligibilitySchema>; Reply: EligibilityResult }>(
    '/benefits/eligibility',
    {
      schema: {
        body: {
          type: 'object',
          required: [
            'veteranStatus',
            'dischargeType',
            'serviceYears',
            'disabilityRating',
            'hasServiceConnectedCondition',
          ],
        },
      },
    },
    async (request, reply) => {
      const _result = EligibilitySchema.safeParse(request.body);
      if (!_result.success) return reply.code(400).send({ error: 'Invalid request', details: _result.error.issues } as unknown as EligibilityResult);
      const answers = _result.data as EligibilityAnswers;
      const result = eligibilityChecker.check(answers);
      return reply.send(result);
    },
  );
};
