// SourceWeights.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Source priority weights for retrieval scoring — derived from va_expert.md knowledge base ordering

// Weights from va_expert.md knowledge base priority ordering — higher = more authoritative
export const SOURCE_WEIGHTS: Readonly<Record<string, number>> = {
  'VA M21-1 Adjudication Procedures Manual': 1.0,
  '38 CFR Part 4 — Schedule for Rating Disabilities': 0.9,
  '38 CFR Part 3 — Adjudication General Provisions': 0.85,
  'Disability Benefits Questionnaires (DBQs)': 0.8,
  '38 U.S.C. — Statutory Authority': 0.7,
  'BVA Decisions': 0.6,
  'VA.gov Benefits Pages': 0.5,
  'Community Intelligence': 0.3,
} as const;

// Source type weights — official regulatory content outranks community contributions
export const SOURCE_TYPE_WEIGHTS: Readonly<Record<string, number>> = {
  official: 1.0,
  verified: 0.8,
  community: 0.3,
} as const;

// Fallback when a source name is not in the registry — neutral mid-range score
const DEFAULT_WEIGHT = 0.5;

export function getSourceWeight(sourceName: string): number {
  return SOURCE_WEIGHTS[sourceName] ?? DEFAULT_WEIGHT;
}

export function getSourceTypeWeight(sourceType: string): number {
  return SOURCE_TYPE_WEIGHTS[sourceType] ?? DEFAULT_WEIGHT;
}
