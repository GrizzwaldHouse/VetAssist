// vre-types.ts
// Developer: Marcus Daley
// Date: 2026-04-27
// Purpose: TypeScript interfaces for the VR&E Chapter 31 Guide feature

// ── Eligibility ───────────────────────────────────────────────────────────────

export type VREDischargeType =
  | 'honorable'
  | 'general'
  | 'other_than_honorable'
  | 'dishonorable'
  | 'unknown';

export interface VREEligibilityInput {
  readonly disabilityRating: number;
  readonly hasMemorandumRating: boolean;
  readonly dischargeType: VREDischargeType;
  readonly hasEmploymentHandicap: boolean;
  readonly separationWithin12Years: boolean;
}

export type VREEligibilityStatus = 'likely_eligible' | 'may_be_eligible' | 'likely_ineligible';

export interface VREEligibilityResult {
  readonly status: VREEligibilityStatus;
  readonly reasons: readonly string[];
  readonly nextSteps: readonly string[];
  readonly cfrCitation: string;
}

// ── Tracks ────────────────────────────────────────────────────────────────────

export type VRETrackId =
  | 'reemployment'
  | 'rapid_access'
  | 'self_employment'
  | 'employment_through_long_term_services'
  | 'independent_living';

export interface VRETrackProCon {
  readonly pros: readonly string[];
  readonly cons: readonly string[];
}

export interface VRETrack {
  readonly id: VRETrackId;
  readonly name: string;
  readonly shortDescription: string;
  readonly fullDescription: string;
  readonly bestFor: string;
  readonly prosCons: VRETrackProCon;
  readonly cfrCitation: string;
}

// ── Chapter 31 vs Chapter 33 comparison ──────────────────────────────────────

export interface VREComparisonRow {
  readonly factor: string;
  readonly chapter31: string;
  readonly chapter33: string;
}

export interface VREComparison {
  readonly irrevocableWarning: string;
  readonly rows: readonly VREComparisonRow[];
}

// ── Application walkthrough ───────────────────────────────────────────────────

export interface VREApplicationStep {
  readonly stepNumber: number;
  readonly title: string;
  readonly description: string;
  readonly actionItems: readonly string[];
  readonly formNumber: string | null;
  readonly timeEstimate: string | null;
}

// ── Full guide response ───────────────────────────────────────────────────────

export interface VREGuideResponse {
  readonly tracks: readonly VRETrack[];
  readonly comparison: VREComparison;
  readonly applicationSteps: readonly VREApplicationStep[];
  readonly cfrBase: string;
}
