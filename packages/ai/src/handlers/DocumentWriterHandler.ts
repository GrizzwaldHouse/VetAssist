// DocumentWriterHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Assembles veteran wizard answers into structured VA documents via document_writer skill

import { randomUUID } from 'crypto';
import type { AIRequest, GeneratedDocument, WizardDocType, WizardAnswers, ScoreResult } from '@vetassist/shared-types';
import { MODELS } from '@vetassist/shared-config';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';
import { DocumentReviewHandler } from './DocumentReviewHandler.js';

interface DocumentWriterDeps {
  readonly provider: AIProvider;
  readonly promptLoader: PromptLoader;
}

// Human-readable titles for each document type — no magic strings in logic
const DOC_TYPE_TITLES: Readonly<Record<WizardDocType, string>> = {
  buddy_letter: 'Buddy Letter / Lay Statement',
  personal_statement: 'Personal Statement (VA Form 21-4138)',
  stressor_statement: 'Stressor Statement (21-0781 Helper)',
  nexus_evidence_package: 'Nexus Evidence Package',
} as const;

// Disclaimer required on every AI-generated document per skill spec
const DOCUMENT_DISCLAIMER =
  'This document was prepared with AI writing assistance. The factual content was provided by the veteran/writer.';

// First-person docs — personal statements are written in the veteran's voice
const FIRST_PERSON_DOC_TYPES: ReadonlySet<WizardDocType> = new Set([
  'personal_statement',
  'stressor_statement',
]);

// Instruction appended to system prompt — overrides any narrative framing in the skill file
const OUTPUT_INSTRUCTION =
  'Return ONLY the document text — no JSON, no markdown headers, no explanation. Write in first person for personal statements and stressor statements, third person for buddy letters and nexus evidence packages.';

// Builds the user message from wizard answers — formatted as readable key-value summary
function buildUserMessage(docType: WizardDocType, answers: WizardAnswers): string {
  const lines = [`Document Type: ${docType}`, '', 'Answers:'];
  for (const [key, value] of Object.entries(answers)) {
    lines.push(`${key}: ${value}`);
  }
  return lines.join('\n');
}

// Derives the correct voice instruction based on document type
function getVoiceInstruction(docType: WizardDocType): string {
  return FIRST_PERSON_DOC_TYPES.has(docType)
    ? 'Write in first person (the veteran is speaking).'
    : 'Write in third person (the writer is describing what they observed).';
}

async function generate(
  sessionId: string,
  docType: WizardDocType,
  answers: WizardAnswers,
  scoringMode: 'encouraging' | 'strict',
  deps: DocumentWriterDeps,
): Promise<GeneratedDocument> {
  const skillPrompt = await deps.promptLoader.load('document_writer');
  const voiceInstruction = getVoiceInstruction(docType);
  const systemPrompt = `${skillPrompt}\n\n${voiceInstruction}\n\n${OUTPUT_INSTRUCTION}`;

  const userMessage = buildUserMessage(docType, answers);

  const request: AIRequest = {
    sessionId,
    sanitizedText: userMessage,
    // System prompt passed as a context chunk — AIProvider merges contextChunks into system block
    contextChunks: [systemPrompt],
    skillId: 'document_writer',
    model: MODELS.reasoning,
    timestamp: new Date().toISOString(),
  };

  const aiResponse = await deps.provider.complete(request);

  // Append the required disclaimer footer after the AI-generated body
  const contentWithDisclaimer = `${aiResponse.text}\n\n---\n${DOCUMENT_DISCLAIMER}`;

  // Auto-score the generated document before returning — reviewer runs on the raw AI text
  let score: ScoreResult;
  try {
    score = await DocumentReviewHandler.review(
      sessionId,
      aiResponse.text,
      scoringMode,
      deps,
    );
  } catch {
    // Fallback score — never block document delivery due to scoring failure
    score = {
      overall: 0,
      mode: scoringMode,
      categories: [],
      suggestions: [],
    };
  }

  return {
    sessionId: sessionId || randomUUID(),
    docType,
    title: DOC_TYPE_TITLES[docType],
    content: contentWithDisclaimer,
    disclaimer: DOCUMENT_DISCLAIMER,
    score,
    generatedAt: new Date().toISOString(),
  };
}

export const DocumentWriterHandler = { generate } as const;
