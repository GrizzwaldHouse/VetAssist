// ModerationService.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Layer-1 auto-moderation — toxicity scoring, PII check, spam detection
// Layer-2 (community reports) and Layer-3 (admin queue) are handled by the API route

import { randomUUID } from 'crypto';
import { PIIDetector } from '@vetassist/pii';
import type { ModerationResult, ModerationFlag } from '@vetassist/shared-types';

// Toxicity threshold above which content is auto-removed without admin review
const AUTO_REMOVE_THRESHOLD = 0.85;
// Threshold above which content is flagged for admin review but not auto-removed
const REVIEW_THRESHOLD = 0.50;

// Community toxicity patterns — detects abuse directed AT others in community posts
// Crisis language (suicide, self-harm) is handled upstream by packages/crisis CrisisDetector,
// which runs on ALL inputs before content reaches this moderation layer.
const TOXIC_PATTERNS: readonly RegExp[] = [
  /\b(murder|piece of (shit|trash|garbage))\b/i,
  /\b(worthless|disgusting)\b/i,
  /\b(scam|fraud|bullshit|fake)\b/i,
];

// Spam signal patterns
const SPAM_PATTERNS: readonly RegExp[] = [
  /https?:\/\//i,
  /\b(buy now|click here|free money|earn \$)\b/i,
  /(.)\1{6,}/,
];

function scoreToxicity(text: string): number {
  let score = 0;
  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(text)) score += 0.35;
  }
  return Math.min(score, 1.0);
}

function detectSpam(text: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(text));
}

export function moderateContent(text: string): ModerationResult {
  const flags: ModerationFlag[] = [];

  // PII check — post must not contain sensitive info
  const piiResult = PIIDetector.scan(text);
  if (piiResult.hasPII) flags.push('pii');

  // Spam detection
  if (detectSpam(text)) flags.push('spam');

  // Community abuse scoring — detects harassment directed at others
  const toxicityScore = scoreToxicity(text);
  if (toxicityScore >= REVIEW_THRESHOLD) flags.push('toxic');

  const isAutoRemove = toxicityScore >= AUTO_REMOVE_THRESHOLD || flags.includes('pii');
  const requiresAdminReview = flags.length > 0 && !isAutoRemove;

  let action: ModerationResult['action'];
  if (isAutoRemove) {
    action = 'removed';
  } else if (requiresAdminReview) {
    action = 'flagged';
  } else {
    action = 'approved';
  }

  const reason = flags.length === 0
    ? 'Content passed all auto-moderation checks.'
    : `Flagged for: ${flags.join(', ')}.`;

  return { action, flags, toxicityScore, requiresAdminReview, reason };
}
