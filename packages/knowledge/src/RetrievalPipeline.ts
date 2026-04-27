// RetrievalPipeline.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Weighted semantic retrieval pipeline — reranks Chroma results by source authority and recency

import { chromaClient, VetAssistChromaClient } from './ChromaClient.js';
import type { KnowledgeChunk, KnowledgeSourceType, RetrievalResult } from './types.js';
import { getSourceWeight } from './SourceWeights.js';

// Minimum combined score required for a chunk to be included in context
const RELEVANCE_THRESHOLD = 0.35;

// Number of days over which freshness linearly decays from 1.0 to RECENCY_MIN_SCORE
const RECENCY_DECAY_DAYS = 180;

// Floor score for chunks that are older than RECENCY_DECAY_DAYS
const RECENCY_MIN_SCORE = 0.5;

// Default number of semantic candidates to fetch from Chroma before reranking
const DEFAULT_FETCH_LIMIT = 20;

// Default number of context strings to return after reranking and thresholding
const DEFAULT_RETURN_LIMIT = 5;

// Milliseconds in one day — used for recency calculation
const MS_PER_DAY = 86_400_000;

// Compute a 0–1 freshness score using linear decay from today to RECENCY_DECAY_DAYS
function computeRecencyScore(expiresAt: string): number {
  const expiresMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();
  const daysUntilExpiry = (expiresMs - nowMs) / MS_PER_DAY;

  // Chunks already expired get the floor score rather than zero — they may still be relevant
  if (daysUntilExpiry <= 0) {
    return RECENCY_MIN_SCORE;
  }

  // Clamp at 1.0 — chunks expiring very far in the future are not penalized further
  const ratio = Math.min(daysUntilExpiry / RECENCY_DECAY_DAYS, 1.0);
  return RECENCY_MIN_SCORE + ratio * (1.0 - RECENCY_MIN_SCORE);
}

// Combines source authority weight (0–1) and recency score (0–1) into a single final score
function computeFinalScore(chunk: KnowledgeChunk, distance: number): number {
  // Convert positional distance proxy to a 0–1 similarity value
  const similarity = 1 / (1 + distance);
  const sourceScore = getSourceWeight(chunk.source);
  const recency = computeRecencyScore(chunk.expiresAt);

  // Weighted blend: similarity is primary, authority and recency are boosters
  return similarity * 0.6 + sourceScore * 0.25 + recency * 0.15;
}

// Formats a single chunk for injection into a prompt context string
function formatChunkForContext(chunk: KnowledgeChunk): string {
  const label = chunk.cfrSection ?? chunk.source;
  return `[${label}] ${chunk.text}`;
}

class RetrievalPipeline {
  readonly #chroma: VetAssistChromaClient;

  constructor(chroma: VetAssistChromaClient) {
    this.#chroma = chroma;
  }

  async retrieveContext(
    sanitizedQuery: string,
    limit: number = DEFAULT_RETURN_LIMIT,
    sourceTypeFilter?: KnowledgeSourceType,
  ): Promise<readonly string[]> {
    // Build optional Chroma where-filter — only applied when caller restricts by source type
    const whereFilter = sourceTypeFilter ? { sourceType: sourceTypeFilter } : undefined;

    const rawChunks = await this.#chroma.queryByText(
      sanitizedQuery,
      DEFAULT_FETCH_LIMIT,
      whereFilter,
    );

    // Chroma returns chunks in ranked order — assign synthetic positional distance for scoring
    const scored: RetrievalResult[] = rawChunks.map((chunk, index) => {
      // Positional distance proxy: first result is closest (distance 0), rest increase linearly
      const syntheticDistance = index * 0.1;
      const finalScore = computeFinalScore(chunk, syntheticDistance);
      return {
        chunk,
        distance: syntheticDistance,
        finalScore,
        retrievalRank: index + 1,
      };
    });

    // Filter out chunks that do not meet the minimum quality threshold
    const filtered = scored.filter((r) => r.finalScore >= RELEVANCE_THRESHOLD);

    // Sort descending by final score — highest authority + freshness first
    filtered.sort((a, b) => b.finalScore - a.finalScore);

    // Cap at the requested limit before formatting
    const top = filtered.slice(0, limit);

    // TODO: emit RAG_CONTEXT_ASSEMBLED when event type is added to EventPayloadMap

    return top.map((r) => formatChunkForContext(r.chunk));
  }
}

export { RetrievalPipeline };

// Singleton — chromaClient is imported from ChromaClient to avoid any circular reference
export const retrievalPipeline = new RetrievalPipeline(chromaClient);
