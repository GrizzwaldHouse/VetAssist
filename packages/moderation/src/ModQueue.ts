// ModQueue.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: In-memory admin moderation queue — stores flagged stories for admin review

import { randomUUID } from 'crypto';
import type { ModQueueEntry, ModerationFlag } from '@vetassist/shared-types';

// MVP: in-memory store — Prisma migration in Phase 4
const queue = new Map<string, ModQueueEntry>();

export function enqueue(
  storyId: string,
  storyTitle: string,
  flags: readonly ModerationFlag[],
  toxicityScore: number,
): ModQueueEntry {
  const entry: ModQueueEntry = {
    id:            randomUUID(),
    storyId,
    storyTitle,
    flags,
    toxicityScore,
    reportCount:   0,
    queuedAt:      new Date().toISOString(),
  };
  queue.set(entry.id, entry);
  return entry;
}

export function incrementReport(storyId: string): void {
  for (const entry of queue.values()) {
    if (entry.storyId === storyId) {
      // Replace with incremented count — entries are readonly, so reconstruct
      const updated: ModQueueEntry = { ...entry, reportCount: entry.reportCount + 1 };
      queue.set(entry.id, updated);
      return;
    }
  }
  // Story not yet in queue — add it with community_report flag
  enqueue(storyId, 'Unknown', ['community_report'], 0);
}

export function listQueue(): readonly ModQueueEntry[] {
  return Array.from(queue.values()).sort(
    (a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime(),
  );
}

export function removeFromQueue(entryId: string): boolean {
  return queue.delete(entryId);
}
