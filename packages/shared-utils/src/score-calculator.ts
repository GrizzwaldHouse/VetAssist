// score-calculator.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Weighted document score aggregation from category scores

import type { ScoreCategory, ScoreResult } from '@vetassist/shared-types';

const CATEGORY_WEIGHTS: Record<string, number> = {
  Specificity: 0.3,
  Completeness: 0.3,
  VA_Alignment: 0.3,
  PII_Safety: 0.1,
};

function calculateOverall(categories: readonly ScoreCategory[]): number {
  let weighted = 0;
  let totalWeight = 0;

  for (const cat of categories) {
    const weight = CATEGORY_WEIGHTS[cat.name] ?? 0.25;
    weighted += cat.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round((weighted / totalWeight) * 100) / 100;
}

function buildScoreResult(
  categories: readonly ScoreCategory[],
  mode: ScoreResult['mode'],
  suggestions: ScoreResult['suggestions'],
): ScoreResult {
  return {
    overall: calculateOverall(categories),
    mode,
    categories,
    suggestions,
  };
}

export const ScoreCalculator = {
  calculateOverall,
  buildScoreResult,
} as const;
