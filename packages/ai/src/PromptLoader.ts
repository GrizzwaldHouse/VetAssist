// PromptLoader.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Loads AI skill prompt files from disk with in-memory caching to prevent redundant reads

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SkillId } from '@vetassist/shared-types';

// All known skill IDs — used by preloadAll to warm the cache at startup
const ALL_SKILL_IDS: readonly SkillId[] = [
  'va_expert',
  'document_reviewer',
  'document_writer',
  'decision_letter',
  'story_builder',
  'compliance_guard',
  'pii_guard',
];

// Maps SkillId to filename when the id does not match the file name on disk
const SKILL_FILENAME_OVERRIDES: Partial<Record<SkillId, string>> = {
  story_builder:  'story_builder_decision_accessibility',
  decision_letter: 'story_builder_decision_accessibility',
};

export class PromptLoader {
  readonly #skillsBasePath: string;
  readonly #cache: Map<SkillId, string>;

  constructor(skillsBasePath: string) {
    if (!skillsBasePath) throw new Error('PromptLoader: skillsBasePath is required');
    this.#skillsBasePath = skillsBasePath;
    this.#cache = new Map();
  }

  // Loads a skill file by ID — returns cached version on subsequent calls
  async load(skillId: SkillId): Promise<string> {
    const cached = this.#cache.get(skillId);
    if (cached !== undefined) return cached;

    const filename = SKILL_FILENAME_OVERRIDES[skillId] ?? skillId;
    const filePath = join(this.#skillsBasePath, `${filename}.md`);
    const content = await readFile(filePath, 'utf-8');
    this.#cache.set(skillId, content);
    return content;
  }

  // Warms cache for all known skill IDs — call at server startup to avoid cold reads
  async preloadAll(): Promise<void> {
    await Promise.all(ALL_SKILL_IDS.map((id) => this.load(id)));
  }

  // Returns diagnostic info about what is currently cached
  getCacheStats(): { loaded: readonly string[]; size: number } {
    return {
      loaded: Array.from(this.#cache.keys()),
      size: this.#cache.size,
    };
  }
}

export function createPromptLoader(skillsBasePath: string): PromptLoader {
  return new PromptLoader(skillsBasePath);
}
