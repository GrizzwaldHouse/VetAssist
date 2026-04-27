// regex-utils.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Compiled regex patterns for PII detection — pure, no side effects

export const RegexUtils = {
  // SSN in dashed format: 123-45-6789
  SSN_DASHED: /\b\d{3}-\d{2}-\d{4}\b/g,

  // SSN with spaces: 123 45 6789
  SSN_SPACED: /\b\d{3}\s\d{2}\s\d{4}\b/g,

  // 9 consecutive digits not part of a longer number — common false-positive source
  // Negative lookahead/lookbehind prevents matching zip+4 and phone numbers
  SSN_CONSECUTIVE: /(?<!\d)\d{9}(?!\d)/g,

  // VA C-file numbers: C1234567 or C12345678
  VA_FILE_NUMBER: /\bC\d{7,8}\b/gi,

  // Credit card: 13-19 digit groups (spacing variants handled by LuhnValidator)
  CREDIT_CARD_GROUPED: /\b(?:\d[ -]?){13,19}\b/g,

  // Date of birth patterns: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
  DOB_SLASH: /\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:19|20)\d{2}\b/g,
  DOB_DASH: /\b(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])-(?:19|20)\d{2}\b/g,
  DOB_ISO: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,

  // Strips all non-digit characters — used for Luhn pre-processing
  NON_DIGITS: /\D/g,
} as const;
