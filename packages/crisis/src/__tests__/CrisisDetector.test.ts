// CrisisDetector.test.ts
// Developer: Marcus Daley
// Date: 2026-05-04
// Purpose: 25+ veteran-specific crisis detection test cases — required gate before merge

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrisisDetector } from '../CrisisDetector.js';
import { MlCrisisLogService } from '../MlCrisisLogService.js';

// Mock MlCrisisLogService so corpus writes don't hit Prisma during tests
vi.mock('../MlCrisisLogService.js', () => ({
  MlCrisisLogService: { logAsync: vi.fn() },
}));

// Default: ML sidecar returns no-crisis so keyword tiers are tested in isolation
const mockFetch = vi.fn();
global.fetch = mockFetch;

function mlReturns(level: number, confidence: number) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ level, confidence }),
  });
}

// Minimal valid UserInput for detectAndEmit calls
const baseInput = {
  userId: null,
  timestamp: new Date().toISOString(),
  source: 'chat' as const,
};

beforeEach(() => {
  mlReturns(0, 0.1); // default: ML says no crisis
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tier 1: Hard regex — method + timeline combos ────────────────────────────
describe('Tier 1 — Hard regex (must never miss)', () => {
  it('detects method + timeline: gun tonight', async () => {
    const result = await CrisisDetector.detectCrisis('I have my gun ready for tonight');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
    expect(result.confidence).toBe(1.0);
  });

  it('detects method + timeline: pills this weekend', async () => {
    const result = await CrisisDetector.detectCrisis('I saved up pills for this weekend');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
  });

  it('detects service weapon language', async () => {
    const result = await CrisisDetector.detectCrisis('I have my service weapon and I am ready');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
  });

  it('detects decided + end it', async () => {
    const result = await CrisisDetector.detectCrisis("I've decided to end it this morning");
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(1);
  });
});

// ─── Tier 2A: High-confidence explicit phrases ────────────────────────────────
describe('Tier 2A — High-confidence phrases (must never miss)', () => {
  it('detects: kill myself', async () => {
    const result = await CrisisDetector.detectCrisis('I want to kill myself');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('detects: end my life', async () => {
    const result = await CrisisDetector.detectCrisis('I just want to end my life');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('detects: better off dead', async () => {
    const result = await CrisisDetector.detectCrisis('Everyone would be better off dead with me gone');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('detects veteran farewell: say goodbye', async () => {
    const result = await CrisisDetector.detectCrisis('I need to say goodbye to my family');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('detects: no reason to live', async () => {
    const result = await CrisisDetector.detectCrisis('There is no reason to live anymore');
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });
});

// ─── Tier 2B: Medium-confidence accumulator ───────────────────────────────────
describe('Tier 2B — Medium accumulator (two phrases must exceed threshold)', () => {
  it('two medium phrases exceed block threshold', async () => {
    const result = await CrisisDetector.detectCrisis(
      'I feel completely hopeless and worthless, nothing left for me'
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });

  it('veteran burden language accumulates to crisis', async () => {
    const result = await CrisisDetector.detectCrisis(
      'I am a burden and everyone would be better without me. I feel worthless and hopeless'
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(2);
  });
});

// ─── Tier 3: Veteran idiom in the ML ambiguous zone ──────────────────────────
describe('Tier 3 — Veteran idiom (ML confirms crisis)', () => {
  beforeEach(() => {
    mlReturns(2, 0.82);
  });

  it('detects: done with this mission', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I'm done with this mission, all of it. I can't go on and I don't see the point"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
    expect(result.mlScore).toBeCloseTo(0.82, 1);
  });

  it('detects: completed my last patrol', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I've completed my last patrol. Nothing left to give and I'm ready to give up"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });

  it('detects: already written the letters', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I've already written the letters. No point anymore, I can't go on"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });

  it('detects: gave everything over there', async () => {
    const result = await CrisisDetector.detectCrisis(
      "I gave everything I had over there. Nothing left for anyone, I'm hopeless"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });

  it('detects: unit does not need me', async () => {
    const result = await CrisisDetector.detectCrisis(
      "My unit doesn't need me anymore. I can't go on like this, I feel worthless"
    );
    expect(result.isCrisis).toBe(true);
    expect(result.tier).toBe(3);
  });
});

// ─── MST and trauma survivor language ─────────────────────────────────────────
describe('MST and trauma context', () => {
  beforeEach(() => {
    mlReturns(2, 0.79);
  });

  it('detects MST survivor language', async () => {
    const result = await CrisisDetector.detectCrisis(
      "After what happened to me I don't see a way out. I can't take it anymore"
    );
    expect(result.isCrisis).toBe(true);
  });

  it('detects disbelief + despair pattern', async () => {
    const result = await CrisisDetector.detectCrisis(
      "No one believed me and I can't go on. I don't see the point"
    );
    expect(result.isCrisis).toBe(true);
  });
});

// ─── False positives — must NOT trigger ───────────────────────────────────────
describe('False positives — must NOT trigger crisis', () => {
  it('rejects: killed it at the gym', async () => {
    const result = await CrisisDetector.detectCrisis('I killed it at the gym today');
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: dead tired', async () => {
    const result = await CrisisDetector.detectCrisis("I'm dead tired after that ruck march");
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: murdered the other team', async () => {
    const result = await CrisisDetector.detectCrisis('We absolutely murdered the other team in paintball');
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: killing for pizza', async () => {
    const result = await CrisisDetector.detectCrisis("I'm gonna kill for some pizza right now");
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: movie destroyed me emotionally', async () => {
    const result = await CrisisDetector.detectCrisis('That movie destroyed me emotionally, so good');
    expect(result.isCrisis).toBe(false);
  });

  it('rejects: this workout is destroying me', async () => {
    const result = await CrisisDetector.detectCrisis('This workout is destroying me in the best way');
    expect(result.isCrisis).toBe(false);
  });
});

// ─── ML sidecar fallback behavior ─────────────────────────────────────────────
describe('ML sidecar fallback behavior', () => {
  it('falls back silently on timeout (AbortError)', async () => {
    mockFetch.mockRejectedValue(new DOMException('aborted', 'AbortError'));
    const result = await CrisisDetector.detectCrisis("I feel hopeless and I don't see a way out");
    expect(result).toHaveProperty('isCrisis');
    expect(result.tier).not.toBe(1);
  });

  it('falls back silently on HTTP 500', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await CrisisDetector.detectCrisis("I feel hopeless and I can't go on");
    expect(result).toHaveProperty('isCrisis');
  });

  it('populates mlScore when ML returns valid response', async () => {
    mlReturns(2, 0.88);
    const result = await CrisisDetector.detectCrisis(
      "I can't go on. I don't see a way out anymore"
    );
    expect(result.tier).toBe(3);
    expect(result.mlScore).toBeCloseTo(0.88, 1);
  });
});

// ─── Corpus logging ───────────────────────────────────────────────────────────
describe('Corpus logging', () => {
  it('calls logAsync after every detectAndEmit', async () => {
    const spy = vi.spyOn(MlCrisisLogService, 'logAsync');
    await CrisisDetector.detectAndEmit({
      ...baseInput,
      text: 'I want to kill myself',
      sessionId: 'test-session-001',
    });
    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'test-session-001', isCrisis: true })
    );
  });

  it('logAsync does not throw when called directly', () => {
    expect(() =>
      MlCrisisLogService.logAsync({
        sessionId: 'test',
        rawText: 'test input',
        tier: 2,
        mlScore: undefined,
        isCrisis: false,
        confidence: 0.3,
        bannerShown: false,
      })
    ).not.toThrow();
  });
});
