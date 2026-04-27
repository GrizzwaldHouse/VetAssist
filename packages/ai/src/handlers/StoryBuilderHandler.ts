// StoryBuilderHandler.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Extracts 2-3 actionable tips from approved veteran stories using story_builder skill

import { randomUUID } from 'crypto';
import type { AIProvider } from '../AIProvider.js';
import type { PromptLoader } from '../PromptLoader.js';
import type { StoryTip, StoryCategory, AIRequest } from '@vetassist/shared-types';

// Tip count per story — per story_builder.md skill specification
const TIPS_PER_STORY = 3;

// Haiku used for classification tasks — cheaper and fast enough for tip extraction
const TIP_MODEL = 'claude-haiku-4-5-20251001' as const;

// Fallback tips returned when AI extraction fails — ensures stories always have tips
const FALLBACK_TIPS: readonly Omit<StoryTip, 'id'>[] = [
  { text: 'Document all service-connected events with dates and witnesses when possible.', cfrCitation: '38 CFR § 3.303', category: 'evidence' },
  { text: 'Request a copy of your C-file before filing any new claim.', cfrCitation: '38 CFR § 1.577', category: 'cp_exam' },
  { text: 'File an Intent to File (ITF) to protect your effective date while gathering evidence.', cfrCitation: '38 CFR § 3.155', category: 'benefits_discovery' },
];

export class StoryBuilderHandler {
  private readonly provider: AIProvider;
  private readonly promptLoader: PromptLoader;

  constructor(provider: AIProvider, promptLoader: PromptLoader) {
    this.provider = provider;
    this.promptLoader = promptLoader;
  }

  async extractTips(storyContent: string, category: StoryCategory): Promise<readonly StoryTip[]> {
    // story_builder skill is combined with decision_accessibility — use 'story_builder' SkillId
    const skillText = await this.promptLoader.load('story_builder');

    const sanitizedText = [
      skillText,
      '',
      '## TASK: COMMUNITY STORY TIP EXTRACTION',
      `Extract exactly ${TIPS_PER_STORY} actionable tips from the veteran story below.`,
      'For each tip, identify the relevant CFR section if applicable.',
      `Return valid JSON array only: [{"text":"...","cfrCitation":"38 CFR § X.X or null","category":"${category}"}]`,
      'Do not include any commentary outside the JSON array.',
      '',
      '## VETERAN STORY',
      storyContent,
    ].join('\n');

    const aiRequest: AIRequest = {
      sessionId:     randomUUID(),
      sanitizedText,
      contextChunks: [],
      skillId:       'story_builder',
      model:         TIP_MODEL,
      timestamp:     new Date().toISOString(),
    };

    try {
      const response = await this.provider.complete(aiRequest);
      return this.parseTips(response.text, category);
    } catch {
      // Fallback tips ensure story always has actionable value even on AI failure
      return FALLBACK_TIPS.map((t) => ({ ...t, id: randomUUID() }));
    }
  }

  private parseTips(raw: string, category: StoryCategory): readonly StoryTip[] {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return FALLBACK_TIPS.map((t) => ({ ...t, id: randomUUID() }));

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Array<{ text?: string; cfrCitation?: string; category?: string }>;
      const tips: StoryTip[] = parsed
        .filter((t) => typeof t.text === 'string' && t.text.length > 0)
        .slice(0, TIPS_PER_STORY)
        .map((t) => ({
          id:          randomUUID(),
          text:        t.text as string,
          cfrCitation: t.cfrCitation ?? null,
          category:    (t.category as StoryCategory) ?? category,
        }));

      return tips.length > 0 ? tips : FALLBACK_TIPS.map((t) => ({ ...t, id: randomUUID() }));
    } catch {
      return FALLBACK_TIPS.map((t) => ({ ...t, id: randomUUID() }));
    }
  }
}
