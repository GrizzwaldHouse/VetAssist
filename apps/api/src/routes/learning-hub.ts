// learning-hub.ts
// Developer: Marcus Daley
// Date: 2026-04-26
// Purpose: Learning Hub API routes — list, filter, and retrieve curated veteran education resources

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { LearningResource, LearningHubResponse, LearningResourceTopic, LearningDifficultyLevel, LearningResourceType } from '@vetassist/shared-types';

// ── Validation schemas ─────────────────────────────────────────────────────────

const RESOURCE_TYPES    = ['video', 'article', 'guide', 'tool'] as const;
const TOPICS            = ['disability_compensation', 'appeals', 'healthcare', 'education', 'housing', 'employment', 'transition', 'general'] as const;
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const ListQuerySchema = z.object({
  topic:      z.enum(TOPICS).optional(),
  type:       z.enum(RESOURCE_TYPES).optional(),
  difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
  q:          z.string().max(200).optional(),
});

// ── Seeded resource library ────────────────────────────────────────────────────
// Key takeaways are extracted at seed time — not per-request — to avoid repeated LLM calls.

const SEEDED_RESOURCES: readonly LearningResource[] = [
  {
    id: 'lr-001',
    title: 'How VA Disability Ratings Work',
    description: 'A plain-English breakdown of how the VA calculates combined disability ratings, what "whole person" math means, and why 50% + 30% does not equal 80%.',
    type: 'guide',
    topic: 'disability_compensation',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'Combined ratings use the "whole person" method — each condition is applied to the remaining able-bodied percentage, not added directly.',
      'Final combined ratings are always rounded to the nearest 10%.',
      'A 0% rating still establishes service connection, which can matter later for unemployability or DIC claims.',
    ],
    sourceUrl: 'https://www.va.gov/disability/about-disability-ratings/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-002',
    title: 'The Three Appeal Lanes Explained',
    description: 'Side-by-side comparison of Supplemental Claim, Higher-Level Review, and Board of Veterans Appeals — including typical timelines, what evidence you can add, and which lane fits which situation.',
    type: 'guide',
    topic: 'appeals',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'Supplemental Claim is the only lane that lets you add new and relevant evidence after a denial.',
      'Higher-Level Review cannot accept new evidence — the senior reviewer looks at the same record with fresh eyes.',
      'Board appeals offer three options: direct review, evidence submission, or a hearing — choose based on how much new evidence you have.',
    ],
    sourceUrl: 'https://www.va.gov/decision-reviews/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-003',
    title: 'Intent to File: Lock In Your Effective Date',
    description: 'How filing an Intent to File (ITF) protects your effective date — and back pay — for up to one year while you gather evidence for your claim.',
    type: 'article',
    topic: 'disability_compensation',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'An ITF costs nothing and can be filed by phone, online, or in person — it does not require any evidence.',
      'Your effective date locks to the ITF date, not the full claim date, meaning potentially thousands in back pay.',
      'You have exactly one year from the ITF date to submit the complete claim before the lock expires.',
    ],
    sourceUrl: 'https://www.va.gov/disability/how-to-file-claim/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-004',
    title: 'Nexus Letters: What They Are and Why You Need One',
    description: 'A nexus letter connects your current diagnosis to your military service. Learn what makes a strong nexus letter, who can write one, and what specific language the VA looks for.',
    type: 'guide',
    topic: 'disability_compensation',
    difficultyLevel: 'intermediate',
    keyTakeaways: [
      'A nexus letter must state the medical opinion to at least a "50% or more likelihood" standard — vague language weakens the claim.',
      'The strongest letters cite your service records, current diagnosis, and relevant medical literature.',
      'Private physicians can write nexus letters — the VA cannot require you to use only VA-assigned doctors.',
    ],
    sourceUrl: 'https://www.va.gov/disability/how-to-file-claim/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-005',
    title: 'TDIU: Total Disability Based on Individual Unemployability',
    description: 'Veterans who cannot maintain substantially gainful employment due to service-connected conditions may qualify for TDIU — paid at the 100% rate even if the combined rating is lower.',
    type: 'guide',
    topic: 'disability_compensation',
    difficultyLevel: 'intermediate',
    keyTakeaways: [
      'Schedular TDIU requires one condition at 60%+ or multiple conditions totaling 70%+ with at least one at 40%.',
      'Extra-schedular TDIU has no rating floor — if unemployability is clearly caused by service-connected conditions, apply anyway.',
      'Marginal employment (below federal poverty line) does not disqualify you from TDIU.',
    ],
    sourceUrl: 'https://www.va.gov/disability/eligibility/special-claims/individual-unemployability/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-006',
    title: 'Understanding C&P Exams',
    description: 'Compensation & Pension exams are the VA\'s medical evaluation of your claimed conditions. This guide explains how to prepare, what to say, and common mistakes veterans make.',
    type: 'guide',
    topic: 'disability_compensation',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'Describe your worst day, not your average day — the exam is a snapshot of your condition\'s impact on daily life.',
      'Never downplay symptoms to seem tough — the examiner is evaluating functional impairment, not character.',
      'You have the right to request a copy of the C&P exam report and to rebut any findings you believe are inaccurate.',
    ],
    sourceUrl: 'https://www.va.gov/disability/va-claim-exam/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-007',
    title: 'Post-9/11 GI Bill vs Montgomery GI Bill: Which Is Right for You?',
    description: 'Comparing Chapter 33 and Chapter 30 benefits — housing allowance, tuition coverage, book stipend, transferability, and the irrevocable election warning.',
    type: 'article',
    topic: 'education',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'Electing Post-9/11 GI Bill (Ch. 33) is irrevocable — you permanently give up Ch. 30 entitlement.',
      'Ch. 33 pays tuition directly to the school; Ch. 30 pays a flat monthly stipend regardless of actual tuition cost.',
      'Transfer of Ch. 33 benefits to dependents requires active duty approval before separation — you cannot do it after.',
    ],
    sourceUrl: 'https://www.va.gov/education/about-gi-bill-benefits/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-008',
    title: 'VA Home Loan: The Funding Fee and When It\'s Waived',
    description: 'VA home loans require no down payment, but most veterans pay a funding fee. Learn who qualifies for a full waiver and how to claim it.',
    type: 'article',
    topic: 'housing',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'Veterans with a service-connected disability rating of 10% or higher are exempt from the funding fee entirely.',
      'Surviving spouses receiving DIC benefits are also fully exempt.',
      'The funding fee can be rolled into the loan — but waiver-eligible veterans should never pay it.',
    ],
    sourceUrl: 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-009',
    title: 'eBenefits vs VA.gov: Which Portal Does What',
    description: 'eBenefits is being retired in favor of VA.gov. This guide maps where features moved and what to do when the old links no longer work.',
    type: 'guide',
    topic: 'general',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'Claims status, letters, and payment history have all moved to VA.gov — bookmark va.gov/manage-va-debt.',
      'Some eBenefits pages still redirect correctly; others show a loading screen indefinitely — use VA.gov directly instead.',
      'Login.gov and ID.me credentials work on both portals during the transition period.',
    ],
    sourceUrl: 'https://www.va.gov/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-010',
    title: 'Buddy Statements: How Lay Evidence Wins Claims',
    description: 'Statements from fellow veterans, family members, or anyone who witnessed your condition can be powerful evidence. Learn the correct format (VA Form 21-10210) and what makes them effective.',
    type: 'guide',
    topic: 'disability_compensation',
    difficultyLevel: 'intermediate',
    keyTakeaways: [
      'Lay evidence can establish in-service incurrence and continuity of symptomatology — two of the three nexus elements.',
      'The most effective buddy statements are specific: dates, places, observed behaviors — not general character statements.',
      'VA Form 21-10210 (Lay/Witness Statement) is the official format but any written statement will be accepted.',
    ],
    sourceUrl: 'https://www.va.gov/find-forms/about-form-21-10210/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-011',
    title: 'SMC: Special Monthly Compensation Beyond 100%',
    description: 'Veterans with severe disabilities may qualify for SMC — additional tax-free compensation above the 100% rate for specific conditions like loss of use of a limb or need for aid and attendance.',
    type: 'guide',
    topic: 'disability_compensation',
    difficultyLevel: 'advanced',
    keyTakeaways: [
      'SMC is not applied for automatically — veterans must claim it or the VA must identify entitlement during a rating review.',
      'Aid and Attendance (SMC-L) applies when a veteran needs help with daily activities like bathing, dressing, or eating.',
      'SMC rates stack — a veteran can receive multiple SMC levels simultaneously for different qualifying conditions.',
    ],
    sourceUrl: 'https://www.va.gov/disability/eligibility/special-claims/specially-adapted-housing-automobile/',
    sourceName: 'VA.gov',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
  {
    id: 'lr-012',
    title: 'Transition Assistance Program (TAP): What to Do Before You Separate',
    description: 'TAP is mandatory for most separating service members. This guide covers what you must complete, what\'s optional, and how to use the time to set up your benefits before day one of civilian life.',
    type: 'guide',
    topic: 'transition',
    difficultyLevel: 'beginner',
    keyTakeaways: [
      'File your VA disability claim during the Benefits Delivery at Discharge (BDD) window — 90 to 180 days before separation — so payments start faster.',
      'Request copies of all your service treatment records before separating — getting them later is slower and harder.',
      'SkillBridge allows active duty members to intern at civilian companies during the final 180 days of service — check with your command.',
    ],
    sourceUrl: 'https://www.tapevents.org/',
    sourceName: 'DoD TAP',
    isVerified: true,
    addedAt: '2026-04-26T00:00:00Z',
  },
];

// ── Route handler ──────────────────────────────────────────────────────────────

export const learningHubRoute: FastifyPluginAsync = async (fastify) => {

  // GET /api/learning — list resources with optional filters
  fastify.get('/learning', async (request, reply) => {
    const parsed = ListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid query parameters', errors: parsed.error.issues });
    }

    const { topic, type, difficulty, q } = parsed.data;
    const searchTerm = q?.toLowerCase().trim();

    let results: readonly LearningResource[] = SEEDED_RESOURCES;

    if (topic) {
      results = results.filter(r => r.topic === (topic as LearningResourceTopic));
    }

    if (type) {
      results = results.filter(r => r.type === (type as LearningResourceType));
    }

    if (difficulty) {
      results = results.filter(r => r.difficultyLevel === (difficulty as LearningDifficultyLevel));
    }

    if (searchTerm) {
      results = results.filter(r =>
        r.title.toLowerCase().includes(searchTerm) ||
        r.description.toLowerCase().includes(searchTerm) ||
        r.keyTakeaways.some(t => t.toLowerCase().includes(searchTerm)),
      );
    }

    const response: LearningHubResponse = {
      resources:  results,
      totalCount: results.length,
    };

    return reply.status(200).send(response);
  });

  // GET /api/learning/:id — single resource by ID
  fastify.get('/learning/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const resource = SEEDED_RESOURCES.find(r => r.id === id);

    if (!resource) {
      return reply.status(404).send({ message: 'Resource not found' });
    }

    return reply.status(200).send(resource);
  });
};
