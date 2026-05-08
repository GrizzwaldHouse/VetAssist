// MlCrisisLogService.ts
// Developer: Marcus Daley
// Date: 2026-05-04
// Purpose: Fire-and-forget corpus logger for MentalRoBERTa training pipeline

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

export interface MlCrisisLogEntry {
  readonly sessionId: string;
  readonly rawText: string;
  readonly tier: number;
  readonly mlScore: number | undefined;
  readonly isCrisis: boolean;
  readonly confidence: number;
  readonly bannerShown: boolean;
}

// Logs a single detection event to the corpus table.
// Fire-and-forget: never awaited by the caller, never throws.
function logAsync(entry: MlCrisisLogEntry): void {
  const textHash = createHash('sha256').update(entry.rawText).digest('hex');

  prisma.mlCrisisLog
    .create({
      data: {
        sessionId: entry.sessionId,
        textHash,
        tier: entry.tier,
        mlScore: entry.mlScore ?? null,
        isCrisis: entry.isCrisis,
        confidence: entry.confidence,
        bannerShown: entry.bannerShown,
      },
    })
    .catch((err: unknown) => {
      // Corpus logging must never break crisis detection
      console.error('[MlCrisisLogService] failed to write corpus entry:', err);
    });
}

export const MlCrisisLogService = {
  logAsync,
} as const;
