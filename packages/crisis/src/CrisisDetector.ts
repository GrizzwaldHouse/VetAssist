// CrisisDetector.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Tiered crisis detection — Tier 1 hard regex, Tier 2 phrase matching, Tier 3 MentalRoBERTa hook
// Architecture: three tiers run in order; any tier triggering halts the pipeline immediately

import type { CrisisResult, UserInput } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { THRESHOLDS, CRISIS_LINE } from '@vetassist/shared-config';

// --- TIER 1: Hard regex — method + timeline combos (highest specificity, lowest false-negative risk)
// These patterns match explicit attempt planning language veterans use.
// Any match immediately yields confidence 1.0 — no further scoring needed.
const TIER1_ATTEMPT_PATTERNS: readonly RegExp[] = [
  /\b(tonight|tomorrow|this (week|weekend|morning|night))\b.{0,60}\b(gun|rifle|pistol|weapon|pills|bridge|rope|hang)\b/i,
  /\b(gun|rifle|pistol|weapon|pills|bridge|rope|hang)\b.{0,60}\b(tonight|tomorrow|this (week|weekend|morning|night))\b/i,
  /\b(i have a plan|i('ve| have) decided|i('m| am) ready)\b.{0,80}\b(die|end it|not be here|gone)\b/i,
  /\b(my service weapon|my (gun|rifle|pistol))\b.{0,60}\b(use it|do it|tonight|ready)\b/i,
];

// --- TIER 2A: High-confidence phrases — explicit statements, single match sufficient
const HIGH_CONFIDENCE_PHRASES: readonly string[] = [
  'kill myself',
  'end my life',
  'take my life',
  'want to die',
  'want to be dead',
  "don't want to be here",
  "don't want to live",
  'thinking about suicide',
  'commit suicide',
  'end it all',
  'no reason to live',
  'better off dead',
  'better off without me',
  // Veteran-specific declarative patterns — calm, not overtly emotional
  "i won't be here",
  "i won't be around",
  'after i am gone',
  'when i am gone',
  'my final',
  'say goodbye',
];

// --- TIER 2B: Medium-confidence phrases — contextual despair, require score accumulation
const MEDIUM_CONFIDENCE_PHRASES: readonly string[] = [
  "can't go on",
  "can't take it anymore",
  'give up on life',
  'no point anymore',
  'nothing left',
  "don't see the point",
  'tired of living',
  'ready to give up',
  // Veteran-specific contextual patterns
  "i don't see a way out",
  "there is no way out",
  'after what happened',
  'what i did over there',
  'i am a burden',
  'everyone would be better',
  'no one would miss me',
  'hopeless',
  'worthless',
];

// --- TIER 3: MentalRoBERTa integration point
// Replace this stub with a real HTTP call to your self-hosted FastAPI endpoint:
//   POST http://ml-pipeline:8001/crisis/classify
//   Body: { text: string }
//   Response: { level: 0|1|2|3, confidence: number }
//   Levels: 0=indicator, 1=ideation, 2=behavior, 3=attempt
// Run this tier only when Tier 2 confidence is in the ambiguous 0.4–0.7 range.
async function callMentalRoBERTa(text: string): Promise<number> {
  // STUB — returns 0 until the ML pipeline endpoint is deployed
  // When the endpoint is live, replace this body with the fetch call above
  void text;
  return 0;
}

function buildCrisisResponse(): string {
  return [
    CRISIS_LINE.displayText,
    '',
    'You are not alone. Please reach out — support is available 24/7, free and confidential.',
  ].join('\n');
}

// Tier 1: hard pattern match — synchronous, runs first
function runTier1(lower: string): boolean {
  return TIER1_ATTEMPT_PATTERNS.some((p) => p.test(lower));
}

// Tier 2: phrase scoring — synchronous
function runTier2(lower: string): { confidence: number; matched: string[] } {
  const matched: string[] = [];
  let confidence = 0;

  for (const phrase of HIGH_CONFIDENCE_PHRASES) {
    if (lower.includes(phrase)) {
      matched.push(phrase);
      confidence = Math.max(confidence, 0.95);
    }
  }

  for (const phrase of MEDIUM_CONFIDENCE_PHRASES) {
    if (lower.includes(phrase)) {
      matched.push(phrase);
      // Each medium phrase raises confidence; two medium matches exceed the block threshold
      confidence = Math.min(confidence + 0.35, 0.90);
    }
  }

  return { confidence, matched };
}

// Main detect function — async to support Tier 3 ML call
async function detectCrisis(text: string): Promise<CrisisResult> {
  const lower = text.toLowerCase();

  // Tier 1: immediate block on method+timeline combos
  if (runTier1(lower)) {
    return {
      isCrisis: true,
      confidence: 1.0,
      matchedPhrases: ['[tier-1-pattern]'],
      tier: 1,
    };
  }

  // Tier 2: phrase scoring
  const { confidence: tier2Confidence, matched } = runTier2(lower);

  if (tier2Confidence >= THRESHOLDS.crisis.confidenceBlock) {
    return {
      isCrisis: true,
      confidence: tier2Confidence,
      matchedPhrases: matched,
      tier: 2,
    };
  }

  // Tier 3: ambiguous range — call MentalRoBERTa for confirmation
  // Level 2+ (behavior/attempt) triggers crisis response even if phrase score was low
  if (tier2Confidence >= 0.4) {
    const mlLevel = await callMentalRoBERTa(text);
    if (mlLevel >= 2) {
      return {
        isCrisis: true,
        confidence: Math.max(tier2Confidence, 0.80),
        matchedPhrases: matched,
        tier: 3,
      };
    }
  }

  return {
    isCrisis: false,
    confidence: tier2Confidence,
    matchedPhrases: matched,
    tier: tier2Confidence > 0 ? 2 : 0,
  };
}

function getCrisisResponseText(): string {
  return buildCrisisResponse();
}

// Full pipeline: detect across all tiers, emit event if crisis, return result
async function detectAndEmit(input: UserInput): Promise<CrisisResult> {
  const result = await detectCrisis(input.text);

  if (result.isCrisis) {
    await eventBus.emit(EVENTS.CRISIS_DETECTED, {
      sessionId: input.sessionId,
      result,
    });
  }

  return result;
}

export const CrisisDetector = {
  detectCrisis,
  detectAndEmit,
  getCrisisResponseText,
} as const;
