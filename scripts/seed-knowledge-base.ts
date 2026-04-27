// seed-knowledge-base.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Seed Chroma vector DB with VA regulatory knowledge chunks — highest-weight sources first

import { randomUUID } from 'crypto';
import { chromaClient } from '../packages/knowledge/src/ChromaClient.js';
import type { KnowledgeChunk } from '../packages/knowledge/src/types.js';

// All expiry dates calculated from today — 180 days for official sources, 90 for others
const TODAY = new Date();
const EXPIRY_180 = new Date(TODAY.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
const EXPIRY_365 = new Date(TODAY.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
const FETCHED_AT = TODAY.toISOString();

// Phase 1 seed chunks — highest-priority regulatory content
// These are representative excerpts; production seed should load full eCFR text via API
const SEED_CHUNKS: readonly KnowledgeChunk[] = [
  {
    id: randomUUID(),
    source: '38 CFR Part 3 — Adjudication General Provisions',
    sourceType: 'official',
    text: 'Under 38 CFR § 3.303(a), service connection may be established for a disability resulting from personal injury suffered or disease contracted in line of duty, or for aggravation of a preexisting injury suffered or disease contracted in line of duty, in the active military, naval, or air service.',
    cfrSection: '38 CFR § 3.303(a)',
    keywords: ['service connection', 'line of duty', 'direct connection', '3.303'],
    weight: 0.85,
    part: '3',
    section: '303',
    subsection: 'a',
    heading: 'Direct Service Connection',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 87,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: '38 CFR Part 3 — Adjudication General Provisions',
    sourceType: 'official',
    text: 'Under 38 CFR § 3.310(a), secondary service connection may be established for a disability that is proximately due to or the result of a service-connected disease or injury. Secondary service connection includes disabilities that are aggravated by a service-connected condition, even if the secondary disability is not caused by it.',
    cfrSection: '38 CFR § 3.310(a)',
    keywords: ['secondary service connection', 'aggravation', 'proximately due to', '3.310'],
    weight: 0.85,
    part: '3',
    section: '310',
    subsection: 'a',
    heading: 'Secondary Service Connection',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 79,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: '38 CFR Part 3 — Adjudication General Provisions',
    sourceType: 'official',
    text: 'Under 38 CFR § 3.304(f), service connection for post-traumatic stress disorder (PTSD) requires: (1) medical evidence establishing a diagnosis of PTSD; (2) credible supporting evidence that the claimed in-service stressor occurred; and (3) a link between current symptomatology and the claimed in-service stressor. For combat veterans, the occurrence of the stressor is conceded if consistent with the circumstances, conditions, or hardships of the veteran's service.',
    cfrSection: '38 CFR § 3.304(f)',
    keywords: ['PTSD', 'post-traumatic stress', 'in-service stressor', 'combat', '3.304'],
    weight: 0.85,
    part: '3',
    section: '304',
    subsection: 'f',
    heading: 'PTSD Service Connection',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 102,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: '38 CFR Part 4 — Schedule for Rating Disabilities',
    sourceType: 'official',
    text: 'Under 38 CFR § 4.1, the percentage ratings in the Rating Schedule represent as far as can practicably be determined the average impairment in earning capacity resulting from such diseases and injuries and their residual conditions in civil occupations. Generally, the degrees of disability specified are also designed to compensate for considerable loss of working time from exacerbations or illnesses proportionate to the severity of the several grades of disability.',
    cfrSection: '38 CFR § 4.1',
    keywords: ['rating schedule', 'earning capacity', 'disability rating', '4.1', 'impairment'],
    weight: 0.9,
    part: '4',
    section: '1',
    subsection: null,
    heading: 'Essentials of Evaluative Rating',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 95,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: '38 CFR Part 4 — Schedule for Rating Disabilities',
    sourceType: 'official',
    text: 'Under 38 CFR § 4.25, the combined degree of disability is computed from the individual ratings using the combined ratings table. The first disability is subtracted from 100 percent to determine the remaining whole person. The percentage rating of the second disability is applied to the remaining whole person, and the result is the additional impairment from the second disability. The combined value is rounded to the nearest 10 percent.',
    cfrSection: '38 CFR § 4.25',
    keywords: ['combined rating', 'whole person', '4.25', 'combined disability', 'rating table'],
    weight: 0.9,
    part: '4',
    section: '25',
    subsection: null,
    heading: 'Combined Ratings Table',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 91,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: 'VA M21-1 Adjudication Procedures Manual',
    sourceType: 'official',
    text: 'When evaluating a claim for service connection, adjudicators must apply the benefit of the doubt standard under 38 U.S.C. § 5107(b). When there is an approximate balance of positive and negative evidence regarding a material issue, the benefit of the doubt shall be given to the veteran. This standard does not require proof to a certainty, but the evidence must be at least in approximate balance before the benefit of the doubt standard applies.',
    cfrSection: '38 U.S.C. § 5107(b)',
    keywords: ['benefit of the doubt', 'approximate balance', '5107', 'M21-1', 'adjudication'],
    weight: 1.0,
    part: null,
    section: '5107',
    subsection: 'b',
    heading: 'Benefit of the Doubt Standard',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 97,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: '38 CFR Part 3 — Adjudication General Provisions',
    sourceType: 'official',
    text: 'Under 38 CFR § 3.102, when there is an approximate balance of positive and negative evidence regarding the merits of an issue material to the determination of the matter, the benefit of the doubt in resolving each such issue shall be given to the claimant. The Secretary is not required to give the benefit of the doubt to the claimant in a case where the claimant\'s own statements are inconsistent or contradictory.',
    cfrSection: '38 CFR § 3.102',
    keywords: ['benefit of the doubt', '3.102', 'approximate balance', 'claimant', 'evidence'],
    weight: 0.85,
    part: '3',
    section: '102',
    subsection: null,
    heading: 'Benefit of the Doubt — Regulatory',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_365,
    tokenCount: 88,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: 'VA M21-1 Adjudication Procedures Manual',
    sourceType: 'official',
    text: 'A nexus letter is a medical opinion that establishes the link between a veteran\'s current disability and their military service. The opinion must be based on a review of the veteran\'s service records, medical history, and a current medical examination. A strong nexus letter states that the condition is "at least as likely as not" related to military service (50% or greater probability). The phrase "at least as likely as not" is the legal standard required under 38 CFR § 3.102.',
    cfrSection: null,
    keywords: ['nexus letter', 'medical opinion', 'at least as likely as not', 'nexus', 'M21-1'],
    weight: 1.0,
    part: null,
    section: null,
    subsection: null,
    heading: 'Nexus Letter Requirements',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_180,
    tokenCount: 108,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
  {
    id: randomUUID(),
    source: 'VA.gov Benefits Pages',
    sourceType: 'official',
    text: 'Total disability based on individual unemployability (TDIU) allows VA to pay a veteran at the 100 percent disability rate even if their combined schedular rating is less than 100 percent. Under 38 CFR § 4.16(a), a veteran may qualify for TDIU if they have one disability rated at 60 percent or higher, or two or more disabilities with a combined rating of 70 percent or more (with at least one disability rated 40 percent or higher), AND the disabilities prevent the veteran from maintaining substantially gainful employment.',
    cfrSection: '38 CFR § 4.16(a)',
    keywords: ['TDIU', 'total disability', 'unemployability', '4.16', 'substantially gainful'],
    weight: 0.5,
    part: '4',
    section: '16',
    subsection: 'a',
    heading: 'Total Disability Individual Unemployability (TDIU)',
    fetchedAt: FETCHED_AT,
    expiresAt: EXPIRY_180,
    tokenCount: 115,
    version: '2025-Q2',
    supersededBy: null,
    citationFrequency: 0,
    lastRetrievedAt: null,
  },
];

async function main(): Promise<void> {
  console.log('[seed-knowledge-base] Starting knowledge base seed...');
  console.log(`[seed-knowledge-base] Inserting ${SEED_CHUNKS.length} chunks`);

  let seeded = 0;
  for (const chunk of SEED_CHUNKS) {
    await chromaClient.upsertChunk(chunk);
    seeded++;
    console.log(`[seed-knowledge-base] ${seeded}/${SEED_CHUNKS.length} — ${chunk.heading ?? chunk.source}`);
  }

  console.log('[seed-knowledge-base] Done. Knowledge base ready.');
}

main().catch((err: unknown) => {
  console.error('[seed-knowledge-base] Fatal error:', err);
  process.exit(1);
});
