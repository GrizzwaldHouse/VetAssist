// ChromaClient.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Chroma vector DB wrapper — lazy collection init, typed CRUD for KnowledgeChunks

import { ChromaClient as ChromaJS } from 'chromadb';
import type { Collection } from 'chromadb';
import type { KnowledgeChunk, ChromaMetadata, KnowledgeSourceType } from './types.js';

// Collection name — single namespace for all VetAssist knowledge chunks
const COLLECTION_NAME = 'vetassist_chunks';

// Env var key — pulled once at construction, never re-read mid-run
const CHROMA_URL_ENV_KEY = 'CHROMA_URL';

// Number of query results to fetch when no limit is specified
const DEFAULT_QUERY_LIMIT = 10;

// Placeholder string stored in Chroma when a nullable field has no value
const NULL_PLACEHOLDER = '__null__';

class VetAssistChromaClient {
  readonly #client: ChromaJS;
  #collection: Collection | null = null;

  constructor() {
    const chromaUrl = process.env[CHROMA_URL_ENV_KEY];
    if (!chromaUrl) {
      throw new Error(
        `VetAssistChromaClient: environment variable "${CHROMA_URL_ENV_KEY}" is required but not set. ` +
          'Set it to your Chroma server URL (e.g. http://localhost:8000).',
      );
    }
    this.#client = new ChromaJS({ path: chromaUrl });
  }

  // Lazy-initializes the collection on first access — avoids blocking constructor
  async #getCollection(): Promise<Collection> {
    if (!this.#collection) {
      this.#collection = await this.#client.getOrCreateCollection({ name: COLLECTION_NAME });
    }
    return this.#collection;
  }

  // Converts a Chroma metadata record back to a KnowledgeChunk — nulls restored from placeholder
  #hydrateChunk(
    id: string,
    document: string,
    metadata: Record<string, string | number | boolean>,
  ): KnowledgeChunk {
    const raw = metadata as Record<string, string | number>;
    const nullable = (val: string | number): string | null =>
      val === NULL_PLACEHOLDER || val === '' ? null : String(val);

    return {
      id,
      source: String(raw['source'] ?? ''),
      sourceType: String(raw['sourceType'] ?? 'official') as KnowledgeSourceType,
      text: document,
      cfrSection: nullable(raw['cfrSection'] ?? NULL_PLACEHOLDER),
      keywords: String(raw['keywords'] ?? '')
        .split('||')
        .filter(Boolean),
      weight: Number(raw['weight'] ?? 0),
      part: nullable(raw['part'] ?? NULL_PLACEHOLDER),
      section: nullable(raw['section'] ?? NULL_PLACEHOLDER),
      subsection: nullable(raw['subsection'] ?? NULL_PLACEHOLDER),
      heading: nullable(raw['heading'] ?? NULL_PLACEHOLDER),
      fetchedAt: String(raw['fetchedAt'] ?? ''),
      expiresAt: String(raw['expiresAt'] ?? ''),
      tokenCount: Number(raw['tokenCount'] ?? 0),
      version: String(raw['version'] ?? ''),
      supersededBy: nullable(raw['supersededBy'] ?? NULL_PLACEHOLDER),
      citationFrequency: Number(raw['citationFrequency'] ?? 0),
      lastRetrievedAt: nullable(raw['lastRetrievedAt'] ?? NULL_PLACEHOLDER),
    };
  }

  // Builds the flat metadata record Chroma requires — all values must be scalar
  #buildMetadata(chunk: KnowledgeChunk): ChromaMetadata & Record<string, string | number> {
    // Arrays are serialized with a delimiter — Chroma does not support nested types
    return {
      source: chunk.source,
      sourceType: chunk.sourceType,
      cfrSection: chunk.cfrSection ?? NULL_PLACEHOLDER,
      weight: chunk.weight,
      part: chunk.part ?? NULL_PLACEHOLDER,
      section: chunk.section ?? NULL_PLACEHOLDER,
      subsection: chunk.subsection ?? NULL_PLACEHOLDER,
      heading: chunk.heading ?? NULL_PLACEHOLDER,
      fetchedAt: chunk.fetchedAt,
      expiresAt: chunk.expiresAt,
      tokenCount: chunk.tokenCount,
      version: chunk.version,
      supersededBy: chunk.supersededBy ?? NULL_PLACEHOLDER,
      citationFrequency: chunk.citationFrequency,
      lastRetrievedAt: chunk.lastRetrievedAt ?? NULL_PLACEHOLDER,
      keywords: chunk.keywords.join('||'),
    };
  }

  async queryByText(
    query: string,
    limit: number = DEFAULT_QUERY_LIMIT,
    whereFilter?: Record<string, string>,
  ): Promise<KnowledgeChunk[]> {
    const collection = await this.#getCollection();
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
      ...(whereFilter ? { where: whereFilter as Record<string, string> } : {}),
    });

    const ids = results.ids[0] ?? [];
    const docs = results.documents[0] ?? [];
    const metas = results.metadatas[0] ?? [];

    return ids.map((id, i) =>
      this.#hydrateChunk(
        id,
        docs[i] ?? '',
        (metas[i] ?? {}) as Record<string, string | number | boolean>,
      ),
    );
  }

  async queryByCFRSection(cfrSection: string, limit: number = DEFAULT_QUERY_LIMIT): Promise<KnowledgeChunk[]> {
    // Filter by exact CFR section metadata field rather than semantic similarity
    return this.queryByText(cfrSection, limit, { cfrSection });
  }

  async upsertChunk(chunk: KnowledgeChunk): Promise<void> {
    const collection = await this.#getCollection();
    await collection.upsert({
      ids: [chunk.id],
      documents: [chunk.text],
      metadatas: [this.#buildMetadata(chunk)],
    });
  }

  async deleteChunk(id: string): Promise<void> {
    const collection = await this.#getCollection();
    await collection.delete({ ids: [id] });
  }

  async getChunkById(id: string): Promise<KnowledgeChunk | null> {
    const collection = await this.#getCollection();
    const result = await collection.get({ ids: [id] });

    const returnedId = result.ids[0];
    if (!returnedId) {
      return null;
    }

    const doc = result.documents[0] ?? '';
    const meta = (result.metadatas[0] ?? {}) as Record<string, string | number | boolean>;
    return this.#hydrateChunk(returnedId, doc, meta);
  }
}

// Export the class so RetrievalPipeline can reference it as a type for constructor injection
export { VetAssistChromaClient };

// Lazy singleton — deferred so tests can import the module without CHROMA_URL set.
// Construction happens on first method call via any method call routing through getCollection().
let _chromaClientInstance: VetAssistChromaClient | null = null;

export function getChromaClient(): VetAssistChromaClient {
  if (!_chromaClientInstance) _chromaClientInstance = new VetAssistChromaClient();
  return _chromaClientInstance;
}

// Proxy for direct chromaClient.method() call sites — defers construction to first use
export const chromaClient: VetAssistChromaClient = new Proxy({} as VetAssistChromaClient, {
  get(_target, prop) {
    const instance = getChromaClient();
    const value = instance[prop as keyof VetAssistChromaClient];
    return typeof value === 'function' ? (value as Function).bind(instance) : value;
  },
});
