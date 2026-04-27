// compliance-engine.test.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Compliance and crisis engine test suite — AAA pattern, mocked external deps only

import { describe, it, expect } from 'vitest';
import { CrisisDetector } from '../packages/crisis/src/CrisisDetector.js';
import { LegalBoundaryEngine } from '../packages/legal/src/LegalBoundaryEngine.js';

// ─── Crisis Detection ─────────────────────────────────────────────────────────

describe('CrisisDetector', () => {
  it('detects "kill myself" as crisis', () => {
    const result = CrisisDetector.detectCrisis("I want to kill myself");
    expect(result.isCrisis).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('detects "end my life" as crisis', () => {
    const result = CrisisDetector.detectCrisis("I just want to end my life");
    expect(result.isCrisis).toBe(true);
  });

  it('detects "no reason to live" as crisis', () => {
    const result = CrisisDetector.detectCrisis("There is no reason to live");
    expect(result.isCrisis).toBe(true);
  });

  it('does NOT flag "I don\'t see the point in filing online" as crisis', () => {
    // This is the key false-positive test from phase1 spec
    const result = CrisisDetector.detectCrisis("I don't see the point in filing online");
    expect(result.isCrisis).toBe(false);
  });

  it('does NOT flag "I am tired of waiting for the VA" as crisis', () => {
    const result = CrisisDetector.detectCrisis("I am tired of waiting for the VA to respond");
    expect(result.isCrisis).toBe(false);
  });

  it('does NOT flag "my back pain is debilitating" as crisis', () => {
    const result = CrisisDetector.detectCrisis("My back pain is debilitating and affects my daily life");
    expect(result.isCrisis).toBe(false);
  });

  it('crisis response text contains Veterans Crisis Line', () => {
    const text = CrisisDetector.getCrisisResponseText();
    expect(text).toContain('988');
    expect(text).toContain('838255');
  });

  it('matched phrases are recorded in the result', () => {
    const result = CrisisDetector.detectCrisis("I want to end it all");
    expect(result.matchedPhrases.length).toBeGreaterThan(0);
  });
});

// ─── Legal Boundary Engine ────────────────────────────────────────────────────

describe('LegalBoundaryEngine', () => {
  it('detects directive language: "you should file"', () => {
    const result = LegalBoundaryEngine.enforce("You should file a claim for your condition.");
    expect(result.hasViolation).toBe(true);
    expect(result.violationTypes).toContain('directive_language');
  });

  it('rewrites directive to educational framing', () => {
    const result = LegalBoundaryEngine.enforce("You should file a claim.");
    expect(result.modifiedText).not.toContain('you should file');
  });

  it('detects outcome guarantee: "you will get"', () => {
    const result = LegalBoundaryEngine.enforce("You will get 70% with this evidence.");
    expect(result.hasViolation).toBe(true);
    expect(result.violationTypes).toContain('outcome_guarantee');
  });

  it('detects eligibility statement: "you qualify"', () => {
    const result = LegalBoundaryEngine.enforce("Based on this, you qualify for TDIU.");
    expect(result.hasViolation).toBe(true);
    expect(result.violationTypes).toContain('eligibility_statement');
  });

  it('appends VSO referral when violation found', () => {
    const result = LegalBoundaryEngine.enforce("You should file now.");
    expect(result.vsoReferralAppended).toBe(true);
    expect(result.modifiedText).toContain('VSO');
  });

  it('passes clean educational response without modification', () => {
    const clean = "Under 38 CFR § 3.303, direct service connection may be established when a condition is documented in service records.";
    const result = LegalBoundaryEngine.enforce(clean);
    expect(result.hasViolation).toBe(false);
    expect(result.modifiedText).toBe(clean);
  });
});

// ─── Event Flow Integrity ─────────────────────────────────────────────────────

describe('Event system — basic wiring', () => {
  it('eventBus subscribe and emit round-trips a payload', async () => {
    const { eventBus, EVENTS } = await import('../packages/events/src/index.js');

    const received: unknown[] = [];
    const unsub = eventBus.subscribe(EVENTS.INPUT_SANITIZED, async (payload) => {
      received.push(payload);
    });

    await eventBus.emit(EVENTS.INPUT_SANITIZED, {
      sessionId: 'test-session',
      sanitizedText: 'clean text',
    });

    expect(received.length).toBe(1);
    expect((received[0] as { sessionId: string }).sessionId).toBe('test-session');

    unsub();
  });
});
