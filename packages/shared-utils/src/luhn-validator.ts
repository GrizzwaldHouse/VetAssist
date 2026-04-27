// luhn-validator.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Luhn algorithm for credit card number validation — pure function

import { THRESHOLDS } from '@vetassist/shared-config';
import { RegexUtils } from './regex-utils.js';

// Validates a digit string passes the Luhn checksum (ISO/IEC 7812)
function isValidLuhn(digits: string): boolean {
  let sum = 0;
  let isAlternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    const charCode = digits.charCodeAt(i);
    // charCode 48 = '0', so digit = charCode - 48
    let digit = charCode - 48;

    if (isAlternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isAlternate = !isAlternate;
  }

  return sum % 10 === 0;
}

// Extracts all digit-only substrings in range [minLen, maxLen] and checks Luhn
function findCreditCards(text: string): readonly string[] {
  const { luhnMinLength, luhnMaxLength } = THRESHOLDS.pii;
  const found: string[] = [];

  const candidates = text.match(RegexUtils.CREDIT_CARD_GROUPED) ?? [];
  for (const candidate of candidates) {
    const digits = candidate.replace(RegexUtils.NON_DIGITS, '');
    if (digits.length >= luhnMinLength && digits.length <= luhnMaxLength && isValidLuhn(digits)) {
      found.push(digits);
    }
  }

  return found;
}

export const LuhnValidator = {
  isValidLuhn,
  findCreditCards,
} as const;
