// LegalBoundaryEngine.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Detects and rewrites AI responses that cross legal boundaries — claim advice, directives, outcome guarantees

import type { LegalBoundaryResult, LegalViolationType, AIResponse } from '@vetassist/shared-types';
import { eventBus, EVENTS } from '@vetassist/events';
import { VSO_REFERRAL } from '@vetassist/shared-config';

// Directive language patterns — phrases the AI must not use
const DIRECTIVE_PATTERNS: readonly RegExp[] = [
  /\byou should file\b/gi,
  /\byou need to (file|appeal|apply|submit)\b/gi,
  /\byou must (file|appeal|apply|submit)\b/gi,
  /\bI recommend (filing|appealing|applying)\b/gi,
  /\bfile (a|an|your) (claim|appeal|application)\b/gi,
];

// Eligibility statement patterns — definitive eligibility assertions
const ELIGIBILITY_PATTERNS: readonly RegExp[] = [
  /\byou (are|were) eligible\b/gi,
  /\byou qualify\b/gi,
  /\byou (do|don't) qualify\b/gi,
  /\byou're entitled\b/gi,
];

// Outcome guarantee patterns — guaranteed result language
const OUTCOME_GUARANTEE_PATTERNS: readonly RegExp[] = [
  /\byou will (get|receive|be awarded|be granted)\b/gi,
  /\bguaranteed\b/gi,
  /\byou are entitled to\b/gi,
  /\byou should receive\b/gi,
  /\byour (rating|claim|appeal) (will|should) (be )?approved\b/gi,
];

// Rewrites directive language to educational framing
function rewriteDirective(text: string): string {
  let rewritten = text;
  for (const pattern of DIRECTIVE_PATTERNS) {
    rewritten = rewritten.replace(pattern, 'veterans in similar situations have considered filing');
  }
  return rewritten;
}

// Rewrites definitive eligibility to conditional framing
function rewriteEligibility(text: string): string {
  let rewritten = text;
  for (const pattern of ELIGIBILITY_PATTERNS) {
    rewritten = rewritten.replace(pattern, 'you may be eligible');
  }
  return rewritten;
}

// Rewrites outcome guarantees to conditional language
function rewriteOutcomeGuarantees(text: string): string {
  let rewritten = text;
  for (const pattern of OUTCOME_GUARANTEE_PATTERNS) {
    rewritten = rewritten.replace(
      pattern,
      'veterans with similar documentation have received',
    );
  }
  return rewritten;
}

function detectViolations(text: string): LegalViolationType[] {
  const types: LegalViolationType[] = [];

  if (DIRECTIVE_PATTERNS.some((p) => p.test(text))) types.push('directive_language');
  if (ELIGIBILITY_PATTERNS.some((p) => p.test(text))) types.push('eligibility_statement');
  if (OUTCOME_GUARANTEE_PATTERNS.some((p) => p.test(text))) types.push('outcome_guarantee');

  // Reset all regex lastIndex after .test()
  [...DIRECTIVE_PATTERNS, ...ELIGIBILITY_PATTERNS, ...OUTCOME_GUARANTEE_PATTERNS].forEach((p) => {
    p.lastIndex = 0;
  });

  return types;
}

function enforce(responseText: string): LegalBoundaryResult {
  const violationTypes = detectViolations(responseText);
  const hasViolation = violationTypes.length > 0;

  let modifiedText = responseText;
  if (hasViolation) {
    modifiedText = rewriteDirective(modifiedText);
    modifiedText = rewriteEligibility(modifiedText);
    modifiedText = rewriteOutcomeGuarantees(modifiedText);
  }

  // VSO referral is appended to every response when violations are found
  const vsoReferralAppended = hasViolation;
  if (vsoReferralAppended) {
    modifiedText = `${modifiedText}\n\n${VSO_REFERRAL.text}`;
  }

  return {
    hasViolation,
    violationTypes,
    modifiedText,
    vsoReferralAppended,
  };
}

async function enforceAndEmit(response: AIResponse): Promise<LegalBoundaryResult> {
  const result = enforce(response.text);

  if (result.hasViolation) {
    await eventBus.emit(EVENTS.LEGAL_BOUNDARY_TRIGGERED, {
      sessionId: response.sessionId,
      result,
    });
  }

  return result;
}

export const LegalBoundaryEngine = {
  enforce,
  enforceAndEmit,
  detectViolations,
} as const;
