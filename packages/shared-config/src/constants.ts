// constants.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Named constants — zero magic numbers or strings anywhere in the codebase

import type { Thresholds } from './types.js';

export const THRESHOLDS: Thresholds = {
  pii: {
    ssnMinDigits: 9,
    luhnMinLength: 13,
    luhnMaxLength: 19,
    vaFileNumberMinDigits: 7,
  },
  crisis: {
    confidenceBlock: 0.7,
    confidenceWarn: 0.4,
  },
  moderation: {
    toxicityBlock: 0.8,
    spamBlock: 0.9,
  },
  compliance: {
    confidenceLow: 0.4,
    confidenceMedium: 0.7,
  },
} as const;

export const MODELS = {
  reasoning: 'claude-sonnet-4-6',
  classification: 'claude-haiku-4-5-20251001',
} as const;

export const DOCUMENT_LIMITS = {
  maxBytes: 10 * 1024 * 1024, // 10 MB
  defaultTtlHours: 24,
  maxTtlDays: 30,
  acceptedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
} as const;

export const CRISIS_LINE = {
  phone: '988',
  phonePrompt: 'Press 1',
  sms: '838255',
  chatUrl: 'VeteransCrisisLine.net',
  displayText: 'If you are in crisis: Call 988 (Press 1) | Text 838255 | Chat VeteransCrisisLine.net',
} as const;

export const VSO_REFERRAL = {
  text: 'For personalized guidance on your specific situation, a VA-accredited Veterans Service Organization (VSO) representative can help you at no cost.',
  url: 'https://www.va.gov/vso/',
} as const;

export const UPLOAD_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  defaultTtlMs: 24 * 60 * 60 * 1000,
  maxTtlMs: 30 * 24 * 60 * 60 * 1000,
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/tiff',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ] as const,
  tempDirEnvKey: 'UPLOAD_TEMP_DIR',
  encryptionAlgorithm: 'aes-256-cbc' as const,
} as const;

export const BENEFITS_CONFIG = {
  maxSearchResults: 50,
  hiddenGemsCount: 5,
  defaultCategory: 'all' as const,
} as const;
