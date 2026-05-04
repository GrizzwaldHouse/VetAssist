// vre.ts
// Developer: Marcus Daley
// Date: 2026-04-27
// Purpose: VR&E Chapter 31 Guide API routes — static educational content, eligibility logic, no auth required

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type {
  VREGuideResponse,
  VRETrack,
  VREComparison,
  VREApplicationStep,
  VREEligibilityInput,
  VREEligibilityResult,
} from '@vetassist/shared-types';

// ── Validation ─────────────────────────────────────────────────────────────────

const DISCHARGE_TYPES = ['honorable', 'general', 'other_than_honorable', 'dishonorable', 'unknown'] as const;

const EligibilityQuerySchema = z.object({
  disabilityRating:        z.coerce.number().int().min(0).max(100),
  hasMemorandumRating:     z.coerce.boolean(),
  dischargeType:           z.enum(DISCHARGE_TYPES),
  hasEmploymentHandicap:   z.coerce.boolean(),
  separationWithin12Years: z.coerce.boolean(),
});

// ── Static guide data ──────────────────────────────────────────────────────────

const VRE_TRACKS: readonly VRETrack[] = [
  {
    id: 'reemployment',
    name: 'Reemployment',
    shortDescription: 'Return to your previous employer with the same or similar job.',
    fullDescription: 'Designed for veterans who can return to their pre-service employer or a similar position with modifications or accommodations. The VR&E counselor works with the employer to arrange suitable placement.',
    bestFor: 'Veterans with a job to return to who need workplace accommodations or brief retraining.',
    prosCons: {
      pros: [
        'Fastest path to employment',
        'Familiar work environment',
        'Employer relationship already established',
        'May require minimal retraining',
      ],
      cons: [
        'Requires a willing employer',
        'Limited if the former position no longer exists',
        'May not be available if condition prevents former duties',
      ],
    },
    cfrCitation: '38 CFR § 21.54',
  },
  {
    id: 'rapid_access',
    name: 'Rapid Access to Employment',
    shortDescription: 'Quick job placement using existing skills with minimal additional training.',
    fullDescription: 'For veterans who are job-ready or nearly job-ready. Focuses on job search assistance, resume development, interview coaching, and direct placement rather than long-term education.',
    bestFor: 'Veterans with marketable civilian skills who need job search support, not retraining.',
    prosCons: {
      pros: [
        'Quickest path for job-ready veterans',
        'Resume, LinkedIn, and interview coaching included',
        'Subsistence allowance during job search period',
        'No long academic program required',
      ],
      cons: [
        'Limited retraining — assumes transferable skills exist',
        'May not lead to career change if skills are purely military',
        'Shorter support window than long-term services track',
      ],
    },
    cfrCitation: '38 CFR § 21.54',
  },
  {
    id: 'self_employment',
    name: 'Self-Employment',
    shortDescription: 'Start or expand a small business suited to your disability and skills.',
    fullDescription: 'Supports veterans who cannot maintain traditional employment due to their disability. VR&E provides business training, tools, equipment, and licensing fees needed to launch a viable small business.',
    bestFor: 'Veterans with an entrepreneurial background or a viable business concept whose disability limits traditional workplace participation.',
    prosCons: {
      pros: [
        'Flexible schedule accommodates disability limitations',
        'Tools, equipment, and startup costs covered',
        'Business training and mentorship included',
        'Long-term income independence',
      ],
      cons: [
        'Requires a viable business plan approved by VR&E',
        'Income is not guaranteed — business risk falls on veteran',
        'Longer program timeline than rapid access',
        'Not suited for all disabilities or skill sets',
      ],
    },
    cfrCitation: '38 CFR § 21.54',
  },
  {
    id: 'employment_through_long_term_services',
    name: 'Employment Through Long-Term Services',
    shortDescription: 'Degree programs, vocational certificates, or technical training for a new career.',
    fullDescription: 'The most comprehensive track — covers college, vocational school, or technical training needed to enter a new field. VR&E pays tuition, books, supplies, and a monthly subsistence allowance for up to 48 months.',
    bestFor: 'Veterans who need substantial retraining or a new career because their disability prevents prior work.',
    prosCons: {
      pros: [
        'Full degree or vocational certificate funded',
        'Monthly subsistence allowance during training',
        'Books, supplies, and required equipment covered',
        'Up to 48 months of education benefits',
      ],
      cons: [
        'Longest time to employment',
        'Requires an approved rehabilitation plan',
        '48-month cap shared with GI Bill if used previously',
        'Subsistence allowance is lower than Post-9/11 housing stipend in some areas',
      ],
    },
    cfrCitation: '38 CFR § 21.54',
  },
  {
    id: 'independent_living',
    name: 'Independent Living',
    shortDescription: 'Support services for veterans whose disability makes employment not currently feasible.',
    fullDescription: 'When employment is not currently feasible due to the severity of service-connected disabilities, this track helps veterans live as independently as possible. Services include assistive technology, home modifications, community integration, and daily living skills training.',
    bestFor: 'Veterans with severe service-connected disabilities for whom competitive employment is not currently achievable.',
    prosCons: {
      pros: [
        'Assistive technology and home modifications funded',
        'Community integration support',
        'No employment requirement',
        'Can transition to employment tracks if condition improves',
      ],
      cons: [
        'Does not lead directly to employment',
        'Requires a finding that employment is not currently feasible',
        'Services vary by location and VR&E office resources',
      ],
    },
    cfrCitation: '38 CFR § 21.54(f)',
  },
];

const VRE_COMPARISON: VREComparison = {
  irrevocableWarning: 'Electing Chapter 33 (Post-9/11 GI Bill) is IRREVOCABLE — you permanently give up Chapter 30 (Montgomery GI Bill) entitlement. This election cannot be undone. Review both programs carefully with a VR&E counselor or VSO before deciding.',
  rows: [
    {
      factor: 'Program name',
      chapter31: 'Vocational Rehabilitation & Employment (VR&E)',
      chapter33: 'Post-9/11 GI Bill',
    },
    {
      factor: 'Tuition coverage',
      chapter31: 'Covers all approved training costs — no cap for most programs',
      chapter33: 'Covers in-state public tuition fully; private school cap applies (~$28K/yr)',
    },
    {
      factor: 'Housing allowance',
      chapter31: 'Subsistence allowance based on training type and dependency status',
      chapter33: 'Monthly housing allowance based on school ZIP code (MHA rate)',
    },
    {
      factor: 'Books & supplies',
      chapter31: 'Actual costs covered with no annual cap',
      chapter33: 'Up to $1,000/year book stipend',
    },
    {
      factor: 'Eligibility requirement',
      chapter31: '10%+ disability rating (or memorandum rating) + employment handicap',
      chapter33: '90+ days of active duty after Sept. 10, 2001 (or 30 days with discharge for disability)',
    },
    {
      factor: 'Duration',
      chapter31: 'Up to 48 months of training (may extend with serious employment handicap)',
      chapter33: 'Up to 36 months of education benefits',
    },
    {
      factor: 'School choice',
      chapter31: 'Must be part of approved rehabilitation plan — counselor approval required',
      chapter33: 'Any VA-approved school; veteran chooses independently',
    },
    {
      factor: 'Transfer to dependents',
      chapter31: 'Cannot be transferred to dependents',
      chapter33: 'Can be transferred to spouse or children (while on active duty)',
    },
    {
      factor: 'Counselor involvement',
      chapter31: 'Assigned VR&E counselor required — individualized rehabilitation plan',
      chapter33: 'No counselor required — veteran manages enrollment directly',
    },
    {
      factor: 'Stacking with other benefits',
      chapter31: 'Can use Ch.31 AND Ch.33 months (Ch.31 used first, Ch.33 preserved)',
      chapter33: 'Using Ch.33 depletes those months permanently',
    },
    {
      factor: 'Best for',
      chapter31: 'Veterans with service-connected disabilities needing structured career rehabilitation',
      chapter33: 'Veterans wanting maximum school flexibility and portable housing allowance',
    },
  ],
};

const VRE_APPLICATION_STEPS: readonly VREApplicationStep[] = [
  {
    stepNumber: 1,
    title: 'Confirm Basic Eligibility',
    description: 'Before applying, verify you meet the minimum requirements: a service-connected disability rating of 10% or higher (or a memorandum rating), an honorable or general discharge, and separation within the past 12 years (extendable for serious employment handicap).',
    actionItems: [
      'Check your current disability rating on VA.gov',
      'Confirm your discharge type on your DD-214',
      'Calculate years since separation',
    ],
    formNumber: null,
    timeEstimate: '15–30 minutes',
  },
  {
    stepNumber: 2,
    title: 'Apply Online via VA.gov',
    description: 'Submit VA Form 28-1900 (Disabled Veterans Application for Vocational Rehabilitation) online at VA.gov or by mail to your nearest VA regional office. No fee. You can apply before your disability rating is finalized if you have a memorandum rating.',
    actionItems: [
      'Log in to VA.gov and navigate to "Apply for VR&E Benefits"',
      'Complete and submit VA Form 28-1900',
      'Save your confirmation number',
    ],
    formNumber: 'VA Form 28-1900',
    timeEstimate: '20–45 minutes',
  },
  {
    stepNumber: 3,
    title: 'Receive Eligibility Determination',
    description: 'After submitting your application, a VR&E case manager will review it and notify you of your eligibility determination — typically within 4–6 weeks. You may be asked to provide additional service records or medical documentation.',
    actionItems: [
      'Watch for a letter or secure message from VA confirming eligibility',
      'Gather service treatment records if requested',
      'Contact the VR&E office if you have not heard back within 6 weeks',
    ],
    formNumber: null,
    timeEstimate: '4–6 weeks',
  },
  {
    stepNumber: 4,
    title: 'Initial Evaluation Appointment',
    description: 'You will meet with a VR&E counselor who will assess your employment handicap, work history, education, interests, and functional limitations. This evaluation determines which of the five service tracks best fits your situation.',
    actionItems: [
      'Bring your DD-214, VA rating decision, and any medical records',
      'Prepare a summary of your work history and education',
      'Be honest about your functional limitations — this shapes your plan',
    ],
    formNumber: null,
    timeEstimate: '1–2 hours (appointment)',
  },
  {
    stepNumber: 5,
    title: 'Develop Your Individualized Rehabilitation Plan',
    description: 'You and your counselor create a written Individualized Written Rehabilitation Plan (IWRP) that specifies your rehabilitation goal, the services you will receive, the timeline, and the training program or employer. You must sign the plan before services begin.',
    actionItems: [
      'Review the proposed plan carefully — you have the right to negotiate',
      'Ensure your goal occupation is realistic and matches your limitations',
      'Ask about subsistence allowance rates for your training type',
      'Sign the IWRP to activate your benefits',
    ],
    formNumber: 'Individualized Written Rehabilitation Plan (IWRP)',
    timeEstimate: '1–3 appointments',
  },
  {
    stepNumber: 6,
    title: 'Begin Training and Receive Benefits',
    description: 'Once your IWRP is signed, training begins and your subsistence allowance starts. VR&E pays tuition and fees directly to the school. You receive a monthly subsistence allowance and book/supply reimbursement. Check in with your counselor regularly.',
    actionItems: [
      'Confirm your school or employer has received payment authorization',
      'Set up direct deposit for your subsistence allowance',
      'Attend all counselor check-ins — missing them can pause benefits',
      'Report any changes in your status, address, or training program immediately',
    ],
    formNumber: null,
    timeEstimate: 'Ongoing',
  },
];

// ── Eligibility logic ──────────────────────────────────────────────────────────

function evaluateEligibility(input: VREEligibilityInput): VREEligibilityResult {
  const reasons: string[]   = [];
  const nextSteps: string[] = [];

  const ratingQualifies = input.disabilityRating >= 10 || input.hasMemorandumRating;
  const dischargeQualifies = input.dischargeType === 'honorable' || input.dischargeType === 'general';
  const withinWindow = input.separationWithin12Years;

  if (!ratingQualifies) {
    reasons.push('A disability rating of 10% or higher is required. A memorandum rating (pre-discharge rating) can also qualify.');
  }

  if (!dischargeQualifies) {
    if (input.dischargeType === 'other_than_honorable') {
      reasons.push('An Other-Than-Honorable discharge may disqualify you — a Character of Discharge review may be needed.');
    } else if (input.dischargeType === 'dishonorable') {
      reasons.push('A Dishonorable discharge disqualifies you from VR&E benefits.');
    } else {
      reasons.push('Your discharge type could not be evaluated — contact a VSO to review your specific situation.');
    }
  }

  if (!withinWindow) {
    reasons.push('VR&E benefits typically require application within 12 years of separation. Extensions may be granted if you have a serious employment handicap.');
    nextSteps.push('Contact your VA regional office to request a 12-year entitlement period extension.');
  }

  if (!input.hasEmploymentHandicap) {
    reasons.push('An employment handicap — meaning your service-connected disability significantly limits your ability to prepare for, obtain, or maintain suitable employment — must be found by a VR&E counselor.');
    nextSteps.push('Schedule an initial VR&E evaluation to have your employment handicap assessed.');
  }

  const allQualify = ratingQualifies && dischargeQualifies && withinWindow && input.hasEmploymentHandicap;
  const someQualify = ratingQualifies && dischargeQualifies;

  const status: VREEligibilityResult['status'] = allQualify
    ? 'likely_eligible'
    : someQualify
      ? 'may_be_eligible'
      : 'likely_ineligible';

  if (status === 'likely_eligible') {
    nextSteps.push('Apply using VA Form 28-1900 on VA.gov.');
    nextSteps.push('Request an initial evaluation appointment with a VR&E counselor.');
  } else if (status === 'may_be_eligible') {
    nextSteps.push('Contact a VA-accredited VSO to review your full situation before applying.');
    nextSteps.push('Apply using VA Form 28-1900 — the counselor will make the final eligibility determination.');
  } else {
    nextSteps.push('Speak with a VA-accredited VSO — some disqualifying factors can be overcome.');
    nextSteps.push('If your discharge was upgraded, re-evaluate your eligibility.');
  }

  return {
    status,
    reasons: reasons.length > 0 ? reasons : ['You appear to meet the basic eligibility requirements for VR&E.'],
    nextSteps,
    cfrCitation: '38 CFR § 21.35',
  };
}

// ── Route plugin ───────────────────────────────────────────────────────────────

export const vreRoute: FastifyPluginAsync = async (fastify) => {

  // GET /api/vre/guide — full static guide: tracks, comparison, application steps
  fastify.get('/vre/guide', async (_request, reply) => {
    const guide: VREGuideResponse = {
      tracks:           VRE_TRACKS,
      comparison:       VRE_COMPARISON,
      applicationSteps: VRE_APPLICATION_STEPS,
      cfrBase:          '38 CFR Part 21 Subpart C',
    };
    return reply.status(200).send(guide);
  });

  // GET /api/vre/eligibility — eligibility check based on query params
  fastify.get('/vre/eligibility', async (request, reply) => {
    const parsed = EligibilityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid eligibility parameters', errors: parsed.error.issues });
    }

    const result = evaluateEligibility(parsed.data as VREEligibilityInput);
    return reply.status(200).send(result);
  });
};
