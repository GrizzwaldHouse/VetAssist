// PromptLoader.ts
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Loads AI skill prompt files from disk with in-memory caching to prevent redundant reads
import { readFile } from 'fs/promises';
import { join } from 'path';
// All known skill IDs — used by preloadAll to warm the cache at startup
const ALL_SKILL_IDS = [
    'va_expert',
    'document_reviewer',
    'document_writer',
    'decision_letter',
    'story_builder',
    'compliance_guard',
    'pii_guard',
];
export class PromptLoader {
    #skillsBasePath;
    #cache;
    constructor(skillsBasePath) {
        if (!skillsBasePath)
            throw new Error('PromptLoader: skillsBasePath is required');
        this.#skillsBasePath = skillsBasePath;
        this.#cache = new Map();
    }
    // Loads a skill file by ID — returns cached version on subsequent calls
    async load(skillId) {
        const cached = this.#cache.get(skillId);
        if (cached !== undefined)
            return cached;
        const filePath = join(this.#skillsBasePath, `${skillId}.md`);
        const content = await readFile(filePath, 'utf-8');
        this.#cache.set(skillId, content);
        return content;
    }
    // Warms cache for all known skill IDs — call at server startup to avoid cold reads
    async preloadAll() {
        await Promise.all(ALL_SKILL_IDS.map((id) => this.load(id)));
    }
    // Returns diagnostic info about what is currently cached
    getCacheStats() {
        return {
            loaded: Array.from(this.#cache.keys()),
            size: this.#cache.size,
        };
    }
}
export function createPromptLoader(skillsBasePath) {
    return new PromptLoader(skillsBasePath);
}
//# sourceMappingURL=PromptLoader.js.map