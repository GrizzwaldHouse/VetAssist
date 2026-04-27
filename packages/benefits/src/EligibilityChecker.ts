// EligibilityChecker.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Rule-based eligibility matching — maps veteran profile to qualifying benefits

import type { BenefitV2, EligibilityAnswers, EligibilityResult } from '@vetassist/shared-types';
import { BENEFITS_SEED } from './benefits-seed.js';

// Discharge types that qualify for most VA benefits
const QUALIFYING_DISCHARGE_TYPES: ReadonlySet<string> = new Set([
  'honorable',
  'general',
]);

// Minimum service years for education benefits
const EDUCATION_MIN_YEARS = 2;

// Minimum disability rating for Aid & Attendance eligibility
const AID_ATTENDANCE_MIN_RATING = 70;

export class EligibilityChecker {
  check(answers: EligibilityAnswers): EligibilityResult {
    const benefits = BENEFITS_SEED.filter((b) => this.isEligible(b, answers));
    return { benefits, totalMatched: benefits.length };
  }

  private isEligible(benefit: BenefitV2, answers: EligibilityAnswers): boolean {
    // Dishonorable discharge disqualifies from all but certain emergency services
    if (answers.dischargeType === 'dishonorable') return false;

    // Healthcare available to veterans and survivors with survivor-tagged benefits
    if (benefit.category === 'healthcare') {
      return answers.veteranStatus !== 'survivor' || benefit.tags.includes('survivor');
    }

    // Education requires minimum service length and qualifying discharge
    if (benefit.category === 'education') {
      return (
        QUALIFYING_DISCHARGE_TYPES.has(answers.dischargeType) &&
        answers.serviceYears >= EDUCATION_MIN_YEARS
      );
    }

    // Compensation requires service-connected condition and disability rating above zero
    if (benefit.category === 'compensation') {
      return answers.hasServiceConnectedCondition && answers.disabilityRating > 0;
    }

    // Aid & Attendance requires higher rating threshold
    if (benefit.tags.includes('aid-attendance')) {
      return answers.disabilityRating >= AID_ATTENDANCE_MIN_RATING;
    }

    // Pension available to all veterans with qualifying discharge
    if (benefit.category === 'pension') {
      return QUALIFYING_DISCHARGE_TYPES.has(answers.dischargeType);
    }

    // Family benefits are available regardless of veteran status
    if (benefit.category === 'family') return true;

    // Burial benefits available to all eligible veterans and survivors
    if (benefit.category === 'burial') return true;

    // Default: available to all veterans with non-dishonorable discharge
    return answers.veteranStatus !== 'survivor';
  }
}
