// pii-scrubber.test.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: PII detection test suite — 20+ cases covering SSN, credit card, VA file, false positive prevention

import { describe, it, expect, vi } from 'vitest';
import { PIIDetector } from '../packages/pii/src/PIIDetector.js';
import { LuhnValidator } from '../packages/shared-utils/src/luhn-validator.js';
import { TextSanitizer } from '../packages/shared-utils/src/text-sanitizer.js';

// ─── SSN Detection ────────────────────────────────────────────────────────────

describe('PIIDetector — SSN detection', () => {
  it('detects dashed SSN: 123-45-6789', () => {
    const result = PIIDetector.scan('My SSN is 123-45-6789 please help');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('SSN');
  });

  it('detects spaced SSN: 123 45 6789', () => {
    const result = PIIDetector.scan('SSN 123 45 6789');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('SSN');
  });

  it('detects consecutive 9-digit SSN: 123456789', () => {
    const result = PIIDetector.scan('number is 123456789');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('SSN');
  });

  it('redacts SSN from sanitized text', () => {
    const result = PIIDetector.scan('SSN: 123-45-6789 is mine');
    expect(result.sanitizedText).not.toContain('123-45-6789');
    expect(result.sanitizedText).toContain('[REDACTED]');
  });

  it('does NOT flag 5-digit zip codes as SSN', () => {
    const result = PIIDetector.scan('I live in zip code 90210');
    expect(result.hasPII).toBe(false);
  });

  it('does NOT flag 10-digit phone numbers as SSN (with formatting)', () => {
    const result = PIIDetector.scan('Call me at (555) 867-5309');
    expect(result.hasPII).toBe(false);
  });

  it('does NOT flag 7-digit phone numbers as SSN', () => {
    const result = PIIDetector.scan('Call 867-5309');
    expect(result.hasPII).toBe(false);
  });

  it('does NOT flag 4-digit pin as SSN', () => {
    const result = PIIDetector.scan('my pin is 1234');
    expect(result.hasPII).toBe(false);
  });

  it('detects SSN embedded in a paragraph', () => {
    const result = PIIDetector.scan(
      'Hi, I am a veteran and my social security number 234-56-7890 is listed on the form.',
    );
    expect(result.hasPII).toBe(true);
  });

  it('detects multiple SSNs in one string', () => {
    const result = PIIDetector.scan('123-45-6789 and 987-65-4321');
    expect(result.hasPII).toBe(true);
    expect(result.sanitizedText.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── VA File Number Detection ─────────────────────────────────────────────────

describe('PIIDetector — VA file number detection', () => {
  it('detects C-file number: C1234567', () => {
    const result = PIIDetector.scan('My VA file number is C1234567');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('VA_FILE_NUMBER');
  });

  it('detects 8-digit C-file: C12345678', () => {
    const result = PIIDetector.scan('C12345678');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('VA_FILE_NUMBER');
  });

  it('detects lowercase c-file: c1234567', () => {
    const result = PIIDetector.scan('file c1234567 is mine');
    expect(result.hasPII).toBe(true);
  });

  it('does NOT flag C followed by fewer than 7 digits', () => {
    const result = PIIDetector.scan('Section C1234 of the form');
    expect(result.detectedTypes).not.toContain('VA_FILE_NUMBER');
  });
});

// ─── Credit Card Detection ────────────────────────────────────────────────────

describe('LuhnValidator — credit card detection', () => {
  // Valid Luhn test card: 4111111111111111 (Visa test number)
  it('detects valid Luhn credit card number', () => {
    const cards = LuhnValidator.findCreditCards('card 4111111111111111 on file');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('does NOT flag invalid Luhn sequence', () => {
    // 4111111111111112 — last digit changed, fails Luhn
    const cards = LuhnValidator.findCreditCards('number 4111111111111112');
    expect(cards.length).toBe(0);
  });

  it('detects card with spaces: 4111 1111 1111 1111', () => {
    const cards = LuhnValidator.findCreditCards('4111 1111 1111 1111');
    expect(cards.length).toBeGreaterThan(0);
  });
});

// ─── DOB Detection ────────────────────────────────────────────────────────────

describe('PIIDetector — date of birth detection', () => {
  it('detects DOB in MM/DD/YYYY format', () => {
    const result = PIIDetector.scan('born on 03/15/1975');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('DOB');
  });

  it('detects DOB in ISO format YYYY-MM-DD', () => {
    const result = PIIDetector.scan('DOB: 1975-03-15');
    expect(result.hasPII).toBe(true);
    expect(result.detectedTypes).toContain('DOB');
  });

  it('does NOT flag years without month/day context', () => {
    const result = PIIDetector.scan('I served from 2001 to 2005');
    expect(result.detectedTypes).not.toContain('DOB');
  });
});

// ─── TextSanitizer ────────────────────────────────────────────────────────────

describe('TextSanitizer — full sanitization pass', () => {
  it('sanitizes SSN and VA file in one pass', () => {
    const text = 'SSN 123-45-6789, file C1234567';
    const sanitized = TextSanitizer.sanitizeAll(text);
    expect(sanitized).not.toContain('123-45-6789');
    expect(sanitized).not.toContain('C1234567');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('preserves non-PII text', () => {
    const text = 'I served in the Army for 8 years in Germany.';
    const sanitized = TextSanitizer.sanitizeAll(text);
    expect(sanitized).toBe(text);
  });
});
