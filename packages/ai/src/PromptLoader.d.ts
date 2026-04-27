import type { SkillId } from '@vetassist/shared-types';
export declare class PromptLoader {
    #private;
    constructor(skillsBasePath: string);
    load(skillId: SkillId): Promise<string>;
    preloadAll(): Promise<void>;
    getCacheStats(): {
        loaded: readonly string[];
        size: number;
    };
}
export declare function createPromptLoader(skillsBasePath: string): PromptLoader;
//# sourceMappingURL=PromptLoader.d.ts.map