// faq-glossary.ts
// Developer: Marcus Daley
// Date: 2026-04-26
// Purpose: FAQ, Glossary, and VA Workaround API routes — read-only reference endpoints, no auth required

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type {
  FAQEntry,
  FAQListResponse,
  GlossaryTerm,
  GlossaryListResponse,
  VAWorkaround,
  FAQCategory,
} from '@vetassist/shared-types';

// ── Validation schemas ─────────────────────────────────────────────────────────

const FAQ_CATEGORIES = ['claims', 'appeals', 'benefits', 'documents', 'ratings', 'eligibility', 'va_website', 'general'] as const;

const FaqListQuerySchema = z.object({
  q:        z.string().max(200).optional(),
  category: z.enum(FAQ_CATEGORIES).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
});

const LetterParamSchema = z.object({
  letter: z.string().length(1).regex(/^[a-zA-Z]$/),
});

// ── Seeded FAQ data ────────────────────────────────────────────────────────────

const SEEDED_FAQ: readonly FAQEntry[] = [
  {
    id: 'faq-001',
    question: 'How does the VA combined rating formula work?',
    answer: 'The VA uses "whole person" math, not simple addition. Each disability is applied to the remaining non-disabled percentage. For example, a 50% rating leaves 50% remaining — a second 30% rating applies to that 50%, adding 15%, for a combined 65% (rounded to 70%). The final rating is always rounded to the nearest 10%.',
    category: 'ratings',
    relatedCFR: '38 CFR § 4.25',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-002',
    question: 'What is an Intent to File (ITF) and why does it matter?',
    answer: 'An ITF locks in your effective date — the date your back pay starts — for up to one year while you gather evidence. You can file one by calling 1-800-827-1000, online at va.gov, or in person at a VA regional office. It costs nothing and requires no evidence.',
    category: 'claims',
    relatedCFR: '38 CFR § 3.155(b)',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-003',
    question: 'What is the difference between a Supplemental Claim and a Higher-Level Review?',
    answer: 'A Supplemental Claim lets you add new and relevant evidence after a denial — it is the only appeal lane that accepts new evidence. A Higher-Level Review has a senior VA rater look at the same record with fresh eyes but cannot accept new evidence. Choose Supplemental if you have new medical evidence; choose HLR if you believe the original decision was a clear legal or factual error.',
    category: 'appeals',
    relatedCFR: '38 CFR § 19.5',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-004',
    question: 'What is a nexus letter and how do I get one?',
    answer: 'A nexus letter is a medical opinion connecting your current diagnosis to your military service. It must state the opinion to at least a "50% or more likely than not" standard. Any licensed physician can write one — you are not required to use a VA doctor. Private nexus letters often carry strong weight when well-documented with service records and medical literature.',
    category: 'documents',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-005',
    question: 'What is TDIU and who qualifies?',
    answer: 'Total Disability based on Individual Unemployability (TDIU) pays at the 100% rate if your service-connected conditions prevent substantially gainful employment. Schedular TDIU requires one condition at 60%+ or multiple conditions totaling 70%+ with at least one at 40%. Extra-schedular TDIU has no rating floor — if your conditions clearly prevent employment, apply regardless.',
    category: 'benefits',
    relatedCFR: '38 CFR § 4.16',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-006',
    question: 'What should I expect at a C&P exam?',
    answer: 'A Compensation and Pension exam evaluates the severity of your claimed conditions. Describe your worst day, not your best — the examiner is measuring functional impairment. Never downplay symptoms. Bring buddy statements and a list of daily limitations. You have the right to request a copy of the exam report and rebut any findings you believe are incorrect.',
    category: 'claims',
    relatedCFR: '38 CFR § 3.159',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-007',
    question: 'How do I check my VA claim status?',
    answer: 'Log in to va.gov and go to "Check your claim or appeal status." eBenefits claim status has moved to VA.gov. If you see a loading screen that does not resolve, try clearing your browser cookies or switching to Firefox. You can also call 1-800-827-1000 for a status update.',
    category: 'va_website',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-008',
    question: 'What is service connection and how is it established?',
    answer: 'Service connection links a current disability to your military service. There are three elements: (1) a current diagnosed disability, (2) an in-service event, injury, or illness, and (3) a nexus (medical link) between the two. Secondary service connection can also be established when a service-connected condition causes or aggravates another condition.',
    category: 'claims',
    relatedCFR: '38 CFR § 3.303',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-009',
    question: 'What is Special Monthly Compensation (SMC)?',
    answer: 'SMC provides additional tax-free compensation above the 100% rate for specific severe conditions — such as loss of use of a limb, need for regular aid and attendance, or being housebound. SMC is not automatically granted; you must claim it or the VA must identify entitlement during a rating review. Multiple SMC levels can stack.',
    category: 'benefits',
    relatedCFR: '38 CFR § 3.350',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-010',
    question: 'Can a buddy statement help my claim?',
    answer: 'Yes. Lay evidence from fellow veterans, family members, or anyone who witnessed your condition can establish in-service incurrence and continuity of symptoms — two of the three nexus elements. The most effective statements are specific: dates, locations, and observed behaviors. Use VA Form 21-10210 (Lay/Witness Statement) or any written statement.',
    category: 'documents',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-011',
    question: 'What is an effective date and how is it determined?',
    answer: 'The effective date is when your VA compensation payments begin — typically the day after separation from service if you file within one year, or the date VA receives your claim. Filing an Intent to File (ITF) locks this date for up to one year, which can mean significant back pay if your claim takes time to process.',
    category: 'claims',
    relatedCFR: '38 CFR § 3.400',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-012',
    question: 'How do I appeal a VA decision I disagree with?',
    answer: 'You have three appeal options under the Appeals Modernization Act: (1) Supplemental Claim — add new evidence; (2) Higher-Level Review — senior rater reviews same record; (3) Board of Veterans Appeals — three sub-options including a hearing. You have one year from the decision date to choose an appeal lane.',
    category: 'appeals',
    relatedCFR: '38 CFR § 19.5',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-013',
    question: 'What is the VA funding fee and who is exempt?',
    answer: 'The VA funding fee is a one-time charge on VA home loans, typically 1.25%–3.3% of the loan amount. Veterans with a service-connected disability rating of 10% or higher are fully exempt. Surviving spouses receiving DIC benefits are also exempt. The fee can be rolled into the loan — but exempt veterans should never pay it.',
    category: 'benefits',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-014',
    question: 'What is the difference between Post-9/11 GI Bill and Montgomery GI Bill?',
    answer: 'Chapter 33 (Post-9/11 GI Bill) pays tuition directly to the school plus a housing allowance and book stipend. Chapter 30 (Montgomery GI Bill) pays a flat monthly stipend regardless of actual tuition. Electing Chapter 33 is irrevocable — you permanently give up Chapter 30 entitlement. If you plan to attend an in-state public school, Chapter 33 is usually better.',
    category: 'benefits',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-015',
    question: 'How do I transfer my GI Bill benefits to my dependents?',
    answer: 'Transfer of Post-9/11 GI Bill benefits must be approved while you are still on active duty — you cannot transfer after separation. You must have at least 6 years of service and agree to serve 4 additional years (or serve to retirement if fewer years remain). Apply through milConnect at milconnect.dmdc.osd.mil.',
    category: 'benefits',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-016',
    question: 'What is a DBQ and do I need one?',
    answer: 'A Disability Benefits Questionnaire (DBQ) is a standardized form that private physicians can complete to document your condition for a VA claim. DBQs mirror what C&P examiners evaluate, so a well-completed DBQ from your own doctor can strengthen your claim — sometimes replacing the need for a VA-ordered C&P exam.',
    category: 'documents',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-017',
    question: 'What is the Benefit Delivery at Discharge (BDD) program?',
    answer: 'BDD allows service members to file VA disability claims 90 to 180 days before separation — so compensation payments can start sooner after discharge. You must have a known separation date and be able to complete a C&P exam before discharge. Filing BDD does not affect your separation timeline.',
    category: 'claims',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-018',
    question: 'Why does my VA.gov page keep loading and never finish?',
    answer: 'This is a known issue on VA.gov, particularly on disability status and claims pages. Common fixes: (1) Clear your browser cookies and cache, then try again; (2) Use Firefox instead of Chrome or Edge; (3) Log out and log back in; (4) If using ID.me, try Login.gov as an alternative credential. If none work, call 1-800-827-1000.',
    category: 'va_website',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-019',
    question: 'What is the Veterans Crisis Line?',
    answer: 'The Veterans Crisis Line provides free, confidential support 24/7. Call 988 and press 1, text 838255, or chat at VeteransCrisisLine.net. Responders are trained to help veterans and their families in crisis. You do not need to be enrolled in VA healthcare to use this service.',
    category: 'general',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-020',
    question: 'What documents should I gather before filing a VA claim?',
    answer: 'Gather: (1) DD-214 or other separation documents; (2) service treatment records (request via milConnect or the National Personnel Records Center); (3) private medical records diagnosing your current conditions; (4) nexus letter from a physician; (5) buddy statements from witnesses; (6) any relevant VA exam reports. The more documentation you provide upfront, the faster the decision.',
    category: 'documents',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-021',
    question: 'What is the VR&E program (Chapter 31)?',
    answer: 'Vocational Rehabilitation and Employment (VR&E), or Chapter 31, helps veterans with service-connected disabilities prepare for, find, and maintain suitable employment — or achieve independent living if employment is not feasible. It covers tuition, books, supplies, and a subsistence allowance. Eligibility requires a 10%+ disability rating (or a memorandum rating) and entitlement to a serious employment handicap.',
    category: 'benefits',
    relatedCFR: '38 CFR § 21.35',
    upvotes: 0,
    sourceType: 'manual',
  },
  {
    id: 'faq-022',
    question: 'What is marginal employment and how does it affect TDIU?',
    answer: 'Marginal employment — income below the federal poverty threshold for one person — does not disqualify you from TDIU. The VA evaluates whether you can maintain "substantially gainful employment," not just any income. Part-time or sheltered workshop employment (in a protected environment specifically for disabled workers) is also considered marginal.',
    category: 'eligibility',
    relatedCFR: '38 CFR § 4.16(a)',
    upvotes: 0,
    sourceType: 'manual',
  },
];

// ── Seeded Glossary data ───────────────────────────────────────────────────────

const SEEDED_GLOSSARY: readonly GlossaryTerm[] = [
  {
    id: 'gl-001',
    term: 'Appeals Modernization Act',
    acronym: 'AMA',
    definition: 'Legislation effective February 2019 that restructured the VA appeals system into three decision-review lanes: Supplemental Claim, Higher-Level Review, and Board of Veterans Appeals.',
    cfrCitation: '38 CFR § 19.5',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-19/section-19.5',
  },
  {
    id: 'gl-002',
    term: 'Board of Veterans Appeals',
    acronym: 'BVA',
    definition: 'A panel of VA attorneys and Veterans Law Judges who review appeals from regional office decisions. BVA appeals offer three options: direct review, evidence submission, or a hearing.',
    cfrCitation: '38 CFR § 20.1',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-20',
  },
  {
    id: 'gl-003',
    term: 'Compensation and Pension Exam',
    acronym: 'C&P Exam',
    definition: 'A medical examination ordered by the VA to evaluate the nature and severity of a veteran\'s claimed disability. The examiner\'s opinion is a key factor in rating decisions.',
    cfrCitation: '38 CFR § 3.159',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.159',
  },
  {
    id: 'gl-004',
    term: 'Combined Rating',
    definition: 'The overall disability percentage calculated using the VA\'s "whole person" formula rather than simple addition. Each successive disability is applied to the remaining non-disabled percentage.',
    cfrCitation: '38 CFR § 4.25',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-A/section-4.25',
  },
  {
    id: 'gl-005',
    term: 'Disability Benefits Questionnaire',
    acronym: 'DBQ',
    definition: 'A standardized VA form that any licensed physician can complete to document a veteran\'s medical condition for a disability claim. DBQs mirror C&P exam criteria and can strengthen claims.',
  },
  {
    id: 'gl-006',
    term: 'Dependency and Indemnity Compensation',
    acronym: 'DIC',
    definition: 'Monthly tax-free compensation paid to eligible surviving spouses, children, and parents of veterans who died from a service-connected condition or while receiving 100% VA disability compensation.',
    cfrCitation: '38 CFR § 3.5',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.5',
  },
  {
    id: 'gl-007',
    term: 'Effective Date',
    definition: 'The date on which VA compensation payments begin. Generally the day after separation if filed within one year, or the date VA receives the claim. An Intent to File can lock this date for up to one year.',
    cfrCitation: '38 CFR § 3.400',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.400',
  },
  {
    id: 'gl-008',
    term: 'Higher-Level Review',
    acronym: 'HLR',
    definition: 'An appeal lane where a senior VA rater reviews the existing claim record for clear error. No new evidence may be submitted. Best used when the original decision contained a factual or legal mistake.',
    cfrCitation: '38 CFR § 19.5',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-19',
  },
  {
    id: 'gl-009',
    term: 'Intent to File',
    acronym: 'ITF',
    definition: 'A notice filed with the VA that locks in a potential effective date for up to one year while a veteran prepares their full claim. Requires no evidence and can be filed by phone, online, or in person.',
    cfrCitation: '38 CFR § 3.155(b)',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.155',
  },
  {
    id: 'gl-010',
    term: 'Lay Evidence',
    definition: 'Testimony from non-medical witnesses — veterans, family members, or others — about observable facts such as in-service events, symptoms, or functional limitations. Can be submitted via VA Form 21-10210.',
  },
  {
    id: 'gl-011',
    term: 'Nexus',
    definition: 'The medical link between a veteran\'s current diagnosis and their military service. Establishing a nexus is one of the three elements required for service connection. A nexus letter from a physician provides this link.',
    cfrCitation: '38 CFR § 3.303',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.303',
  },
  {
    id: 'gl-012',
    term: 'Nexus Letter',
    definition: 'A written medical opinion from a licensed physician connecting a veteran\'s current diagnosis to their military service. Must state the opinion to at least a "50% or more likely than not" standard to carry evidentiary weight.',
  },
  {
    id: 'gl-013',
    term: 'Permanent and Total',
    acronym: 'P&T',
    definition: 'A rating designation indicating that a veteran\'s disabilities are both total (100% combined rating or TDIU) and permanent (no likelihood of improvement). P&T status unlocks additional benefits including Chapter 35 DEA and Commissary access.',
    cfrCitation: '38 CFR § 3.340',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.340',
  },
  {
    id: 'gl-014',
    term: 'Rating Decision',
    definition: 'The VA\'s written determination on a disability claim, stating the service-connected conditions, assigned rating percentages, effective dates, and the evidence considered. Veterans have one year from the rating decision date to appeal.',
  },
  {
    id: 'gl-015',
    term: 'Regional Office',
    acronym: 'VARO',
    definition: 'A local VA office that processes disability compensation claims, pension claims, and other VA benefits. Initial rating decisions are made at the regional office level.',
  },
  {
    id: 'gl-016',
    term: 'Schedule for Rating Disabilities',
    acronym: 'VASRD',
    definition: 'The VA\'s official rating schedule that assigns disability percentages (0%, 10%, 20%...100%) to specific conditions based on their severity and impact on earning capacity.',
    cfrCitation: '38 CFR Part 4',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4',
  },
  {
    id: 'gl-017',
    term: 'Secondary Service Connection',
    definition: 'Service connection established when a service-connected condition directly causes or aggravates another condition. For example, a service-connected knee injury that causes a hip disability may establish secondary service connection for the hip.',
    cfrCitation: '38 CFR § 3.310',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.310',
  },
  {
    id: 'gl-018',
    term: 'Service Connection',
    acronym: 'SC',
    definition: 'The VA\'s determination that a veteran\'s disability is related to their military service. Requires three elements: a current diagnosis, an in-service event or injury, and a nexus linking the two.',
    cfrCitation: '38 CFR § 3.303',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.303',
  },
  {
    id: 'gl-019',
    term: 'Special Monthly Compensation',
    acronym: 'SMC',
    definition: 'Additional VA compensation above the 100% rate for veterans with specific severe conditions — such as loss of use of a limb, need for aid and attendance, or being housebound. SMC rates stack and must be specifically claimed.',
    cfrCitation: '38 CFR § 3.350',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.350',
  },
  {
    id: 'gl-020',
    term: 'Supplemental Claim',
    definition: 'An appeal lane that allows veterans to submit new and relevant evidence after a VA denial. The only AMA lane that accepts new evidence. Ideal when you have new medical records, a nexus letter, or a DBQ that was not part of the original record.',
    cfrCitation: '38 CFR § 3.2501',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.2501',
  },
  {
    id: 'gl-021',
    term: 'Total Disability based on Individual Unemployability',
    acronym: 'TDIU',
    definition: 'A VA benefit that compensates veterans at the 100% rate when service-connected conditions prevent substantially gainful employment, even if the combined rating is below 100%.',
    cfrCitation: '38 CFR § 4.16',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-A/section-4.16',
  },
  {
    id: 'gl-022',
    term: 'Veterans Benefits Administration',
    acronym: 'VBA',
    definition: 'The VA administration responsible for administering compensation, pension, education, housing, and vocational rehabilitation programs for veterans and their dependents.',
  },
  {
    id: 'gl-023',
    term: 'Veterans Service Organization',
    acronym: 'VSO',
    definition: 'A nonprofit organization recognized by the VA to represent veterans in claims and appeals at no charge. VSO accredited representatives (VSRs) are authorized to prepare, present, and prosecute VA claims. Examples: DAV, VFW, American Legion.',
  },
  {
    id: 'gl-024',
    term: 'Vocational Rehabilitation and Employment',
    acronym: 'VR&E',
    definition: 'A VA program (Chapter 31) that helps veterans with service-connected disabilities prepare for, find, and maintain suitable employment or achieve independent living. Covers tuition, books, supplies, and a monthly subsistence allowance.',
    cfrCitation: '38 CFR § 21.35',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-21/subpart-C/section-21.35',
  },
  {
    id: 'gl-025',
    term: 'Whole Person Method',
    definition: 'The VA\'s formula for calculating combined disability ratings. Each disability is applied to the remaining non-disabled percentage rather than added directly. This means 50% + 30% = 65% (rounded to 70%), not 80%.',
    cfrCitation: '38 CFR § 4.25',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-A/section-4.25',
  },
  {
    id: 'gl-026',
    term: 'Aid and Attendance',
    acronym: 'A&A',
    definition: 'An SMC benefit level (SMC-L) for veterans who need help with daily activities such as bathing, dressing, eating, or adjusting prostheses, or who are bedridden or a patient in a nursing home.',
    cfrCitation: '38 CFR § 3.352',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.352',
  },
  {
    id: 'gl-027',
    term: 'Benefit Delivery at Discharge',
    acronym: 'BDD',
    definition: 'A VA program allowing service members to file disability claims 90 to 180 days before separation so that compensation can begin sooner after discharge. Requires a known separation date and ability to complete a C&P exam before discharge.',
  },
  {
    id: 'gl-028',
    term: 'Continuity of Symptomatology',
    definition: 'Evidence showing that a condition or its symptoms have persisted from the time of service to the present. Establishing continuity can substitute for a direct nexus in certain cases, particularly for conditions first diagnosed after service.',
    cfrCitation: '38 CFR § 3.303(b)',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.303',
  },
  {
    id: 'gl-029',
    term: 'Clear and Unmistakable Error',
    acronym: 'CUE',
    definition: 'A specific legal error in a prior final VA decision that, if corrected, would change the outcome. CUE challenges have no time limit but require showing the error was undebatable and outcome-determinative — a high legal standard.',
    cfrCitation: '38 CFR § 20.1403',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-20/subpart-O/section-20.1403',
  },
  {
    id: 'gl-030',
    term: 'Duty to Assist',
    definition: 'The VA\'s legal obligation to help veterans develop their claims — including requesting relevant records, scheduling C&P exams, and notifying veterans of what evidence is needed. Failure to fulfill this duty can be grounds for appeal.',
    cfrCitation: '38 CFR § 3.159',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.159',
  },
  {
    id: 'gl-031',
    term: 'Earning Capacity',
    definition: 'The foundation of VA disability ratings — ratings reflect the average impairment of earning capacity in civilian life resulting from a disability, not the total incapacity of the veteran.',
    cfrCitation: '38 CFR § 4.1',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-4/subpart-A/section-4.1',
  },
  {
    id: 'gl-032',
    term: 'In-Service Incurrence',
    definition: 'An event, injury, or illness that occurred during active military service. One of the three elements required to establish direct service connection. Documented in service treatment records or through lay evidence.',
    cfrCitation: '38 CFR § 3.303',
    cfrLink: 'https://www.ecfr.gov/current/title-38/chapter-I/part-3/subpart-A/section-3.303',
  },
];

// ── Seeded VA Workaround data ──────────────────────────────────────────────────

const SEEDED_WORKAROUNDS: readonly VAWorkaround[] = [
  {
    id: 'wa-001',
    issue: 'VA.gov disability page shows an endless loading screen',
    symptom: 'The page spinner runs indefinitely and the content never loads, even after several minutes.',
    solution: 'Clear your browser cookies and cache, then reload. If that does not work, switch to Firefox — this issue is most common in Chrome and Edge. Logging out of VA.gov and back in also resolves it in many cases.',
    affectedPage: 'va.gov/disability',
  },
  {
    id: 'wa-002',
    issue: 'eBenefits redirects fail or show outdated information',
    symptom: 'Clicking an eBenefits link results in a redirect loop, a blank page, or a "feature not available" message.',
    solution: 'Navigate directly to the equivalent VA.gov page instead of using eBenefits. Most features have moved: claims status is at va.gov/track-claims, letters are at va.gov/records/download-va-letters, and payment history is at va.gov/va-payment-history. Bookmark the VA.gov versions going forward.',
    affectedPage: 'ebenefits.va.gov',
  },
  {
    id: 'wa-003',
    issue: 'ID.me login fails or loops back to the sign-in page',
    symptom: 'After entering credentials, the page redirects back to the VA.gov sign-in screen without logging in, or shows a generic error.',
    solution: 'Try using Login.gov as your credential provider instead of ID.me — both work on VA.gov during the ongoing identity modernization. If you do not have a Login.gov account, create one at login.gov (free). Also try disabling browser extensions like ad blockers or VPNs, which can interfere with the OAuth flow.',
    affectedPage: 'va.gov/sign-in',
  },
  {
    id: 'wa-004',
    issue: 'VA.gov claim status shows "We don\'t know your status" after a long time',
    symptom: 'Claim status displays "We\'re working on your claim" or "We don\'t know your status" for weeks or months with no update.',
    solution: 'This display issue does not necessarily mean your claim is stalled. Call 1-800-827-1000 to get an actual status update from a VA representative. You can also contact your VSO or visit your regional VA office in person for a faster status check. The online status tracker sometimes lags behind actual processing.',
    affectedPage: 'va.gov/track-claims',
  },
  {
    id: 'wa-005',
    issue: 'Unable to upload documents on VA.gov',
    symptom: 'The document upload button does not respond, the upload spinner runs forever, or the upload fails with a generic error.',
    solution: 'Check that your file is under 25MB and is one of the accepted formats: PDF, JPG, PNG, or TIF. If the upload still fails, try a different browser (Firefox is most reliable). As a fallback, you can mail documents to your VA regional office, use a VSO to submit on your behalf, or drop off documents in person.',
    affectedPage: 'va.gov/decision-reviews/upload-evidence',
  },
];

// ── Route plugin ───────────────────────────────────────────────────────────────

export const faqGlossaryRoute: FastifyPluginAsync = async (fastify) => {

  // GET /api/faq — paginated list with optional category and keyword filters
  fastify.get('/faq', async (request, reply) => {
    const parsed = FaqListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid query parameters', errors: parsed.error.issues });
    }

    const { q, category, page, pageSize } = parsed.data;
    const searchTerm = q?.toLowerCase().trim();

    let results: readonly FAQEntry[] = SEEDED_FAQ;

    if (category) {
      results = results.filter(e => e.category === (category as FAQCategory));
    }

    if (searchTerm) {
      results = results.filter(e =>
        e.question.toLowerCase().includes(searchTerm) ||
        e.answer.toLowerCase().includes(searchTerm),
      );
    }

    const total     = results.length;
    const start     = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

    const response: FAQListResponse = { entries: paginated, total, page, pageSize };
    return reply.status(200).send(response);
  });

  // GET /api/faq/search — full-text search, returns up to 20 results
  fastify.get('/faq/search', async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Query parameter "q" is required', errors: parsed.error.issues });
    }

    const term = parsed.data.q.toLowerCase().trim();
    const results = SEEDED_FAQ.filter(e =>
      e.question.toLowerCase().includes(term) ||
      e.answer.toLowerCase().includes(term),
    ).slice(0, 20);

    return reply.status(200).send(results);
  });

  // POST /api/faq/:id/upvote — increment upvote (in-memory for MVP)
  fastify.post('/faq/:id/upvote', async (request, reply) => {
    const { id } = request.params as { id: string };
    const entry = SEEDED_FAQ.find(e => e.id === id);
    if (!entry) {
      return reply.status(404).send({ message: 'FAQ entry not found' });
    }
    // Upvotes are ephemeral in the MVP in-memory store — persist via Prisma in a future sprint
    return reply.status(200).send({ id, upvotes: entry.upvotes + 1 });
  });

  // GET /api/glossary — all terms sorted alphabetically
  fastify.get('/glossary', async (_request, reply) => {
    const sorted = [...SEEDED_GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
    const response: GlossaryListResponse = { terms: sorted, total: sorted.length };
    return reply.status(200).send(response);
  });

  // GET /api/glossary/search — full-text search across term, definition, acronym
  fastify.get('/glossary/search', async (request, reply) => {
    const parsed = SearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Query parameter "q" is required', errors: parsed.error.issues });
    }

    const term = parsed.data.q.toLowerCase().trim();
    const results = SEEDED_GLOSSARY.filter(g =>
      g.term.toLowerCase().includes(term) ||
      g.definition.toLowerCase().includes(term) ||
      g.acronym?.toLowerCase().includes(term),
    );

    return reply.status(200).send(results);
  });

  // GET /api/glossary/letter/:letter — terms starting with a given letter
  fastify.get('/glossary/letter/:letter', async (request, reply) => {
    const parsed = LetterParamSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Parameter must be a single letter A–Z' });
    }

    const letter = parsed.data.letter.toUpperCase();
    const results = SEEDED_GLOSSARY
      .filter(g => g.term.toUpperCase().startsWith(letter))
      .sort((a, b) => a.term.localeCompare(b.term));

    return reply.status(200).send(results);
  });

  // GET /api/workarounds — all VA website workaround guides
  fastify.get('/workarounds', async (_request, reply) => {
    return reply.status(200).send(SEEDED_WORKAROUNDS);
  });
};
