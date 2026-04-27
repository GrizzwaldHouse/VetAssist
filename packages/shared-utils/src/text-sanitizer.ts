// text-sanitizer.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Text sanitization utilities — redact PII patterns from strings

import { RegexUtils } from './regex-utils.js';

const REDACTED_LABEL = '[REDACTED]';

function redactSsn(text: string): string {
  return text
    .replace(RegexUtils.SSN_DASHED, REDACTED_LABEL)
    .replace(RegexUtils.SSN_SPACED, REDACTED_LABEL)
    .replace(RegexUtils.SSN_CONSECUTIVE, REDACTED_LABEL);
}

function redactVaFileNumbers(text: string): string {
  return text.replace(RegexUtils.VA_FILE_NUMBER, REDACTED_LABEL);
}

function redactDob(text: string): string {
  return text
    .replace(RegexUtils.DOB_SLASH, REDACTED_LABEL)
    .replace(RegexUtils.DOB_DASH, REDACTED_LABEL)
    .replace(RegexUtils.DOB_ISO, REDACTED_LABEL);
}

// Redacts the digit string from text — used after Luhn confirms it's a card number
function redactCreditCardDigits(text: string, digits: string): string {
  // Build a flexible regex that matches the digits with optional spaces/dashes
  const flexible = digits.split('').join('[\\s-]?');
  const pattern = new RegExp(flexible, 'g');
  return text.replace(pattern, REDACTED_LABEL);
}

// Full sanitization pass — strips all known PII patterns
function sanitizeAll(text: string): string {
  return redactVaFileNumbers(redactDob(redactSsn(text)));
}

export const TextSanitizer = {
  redactSsn,
  redactVaFileNumbers,
  redactDob,
  redactCreditCardDigits,
  sanitizeAll,
} as const;
