// RequestClassifier.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Classify incoming user requests to route to the correct AI handler

import type { ClassifiedRequest, RequestType, SkillId } from '@vetassist/shared-types';

// Keywords that indicate the veteran is pasting or describing a VA decision letter
const DECISION_LETTER_KEYWORDS: readonly string[] = [
  'decision letter',
  'rating decision',
  'they denied',
  'they approved',
  'the va decided',
  'my claim was denied',
  'my claim was approved',
  '100%',
  'service connection was denied',
];

// Keywords that indicate the veteran wants a document reviewed or scored
const DOCUMENT_REVIEW_KEYWORDS: readonly string[] = [
  'review my',
  'check my',
  'look at my',
  'buddy letter',
  'personal statement',
  'nexus letter',
  'rate my document',
  'score my',
];

// Keywords that indicate the veteran wants help drafting a document
const DOCUMENT_WRITE_KEYWORDS: readonly string[] = [
  'write a',
  'help me write',
  'generate a',
  'draft a',
  'buddy letter for',
  'personal statement for',
];

// Maps each RequestType to its canonical SkillId
const SKILL_MAP: Readonly<Record<RequestType, SkillId>> = {
  decision_letter: 'va_expert',
  document_review: 'document_reviewer',
  document_write: 'document_writer',
  chat: 'va_expert',
  story_build: 'story_builder',
};

// Confidence assigned when a keyword match is found — no match defaults to lower value
const CONFIDENCE_MATCH = 0.85;
const CONFIDENCE_DEFAULT = 0.6;

function matchesAny(lowerText: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => lowerText.includes(kw));
}

function classifyRequest(text: string): ClassifiedRequest {
  const lower = text.toLowerCase();

  let type: RequestType;
  let confidence: number;

  if (matchesAny(lower, DECISION_LETTER_KEYWORDS)) {
    type = 'decision_letter';
    confidence = CONFIDENCE_MATCH;
  } else if (matchesAny(lower, DOCUMENT_REVIEW_KEYWORDS)) {
    type = 'document_review';
    confidence = CONFIDENCE_MATCH;
  } else if (matchesAny(lower, DOCUMENT_WRITE_KEYWORDS)) {
    type = 'document_write';
    confidence = CONFIDENCE_MATCH;
  } else {
    type = 'chat';
    confidence = CONFIDENCE_DEFAULT;
  }

  return {
    type,
    confidence,
    skillId: SKILL_MAP[type],
  };
}

export const RequestClassifier = { classifyRequest } as const;
