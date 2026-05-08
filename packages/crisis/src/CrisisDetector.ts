// CrisisDetector.ts
// Developer: Marcus Daley
// Date: 2026-04-28
// Purpose: Tiered crisis detection — Tier 1 hard regex, Tier 2 phrase matching, Tier 3 MentalRoBERTa hook
// Architecture: three tiers run in order; any tier triggering halts the pipeline immediately

import type { CrisisResult, UserInput } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { THRESHOLDS, CRISIS_LINE, ML_PIPELINE } from '@vetassist/shared-config';
import { MlCrisisLogService } from './MlCrisisLogService.js';

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

// --- TIER 3: MentalRoBERTa — real HTTP call to ml-pipeline Railway service
// Fires only in the ambiguous confidence zone where keywords are insufficient.
// Returns level + confidence from the classifier; falls back silently on any failure.
interface MlResponse {
  readonly level: number;
  readonly confidence: number;
}

async function callMentalRoBERTa(text: string): Promise<MlResponse> {
  const url = `${ML_PIPELINE.url}${ML_PIPELINE.classifyPath}`;

  const attempt = async (): Promise<MlResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ML_PIPELINE.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!res.ok) return { level: 0, confidence: 0 };
      const data = (await res.json()) as MlResponse;
      return { level: data.level ?? 0, confidence: data.confidence ?? 0 };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch {
    try {
      return await attempt();
    } catch {
      // Both attempts failed — silent fallback, Tiers 1+2 result stands
      return { level: 0, confidence: 0 };
    }
  }
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
      // Each medium phrase raises confidence; two medium phrases land in the Tier 3 zone (0.60)
      confidence = Math.min(confidence + 0.30, 0.90);
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
  if (tier2Confidence >= THRESHOLDS.crisis.confidenceWarn) {
    const ml = await callMentalRoBERTa(text);
    if (ml.level >= 2) {
      return {
        isCrisis: true,
        confidence: Math.max(tier2Confidence, 0.80),
        matchedPhrases: matched,
        tier: 3,
        mlScore: ml.confidence,
      };
    }
    // ML ran but did not confirm crisis — return non-crisis with mlScore for audit
    return {
      isCrisis: false,
      confidence: tier2Confidence,
      matchedPhrases: matched,
      tier: 3,
      mlScore: ml.confidence,
    };
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

// Full pipeline: detect across all tiers, emit event if crisis, log corpus entry, return result
async function detectAndEmit(input: UserInput): Promise<CrisisResult> {
  const result = await detectCrisis(input.text);

  if (result.isCrisis) {
    await eventBus.emit(EVENTS.CRISIS_DETECTED, {
      sessionId: input.sessionId,
      result,
    });
  }

  // Fire-and-forget corpus log — never awaited, never blocks detection
  MlCrisisLogService.logAsync({
    sessionId: input.sessionId,
    rawText: input.text,
    tier: result.tier,
    mlScore: result.mlScore,
    isCrisis: result.isCrisis,
    confidence: result.confidence,
    bannerShown: result.isCrisis,
  });

  return result;
}

export const CrisisDetector = {
  detectCrisis,
  detectAndEmit,
  getCrisisResponseText,
} as const;
