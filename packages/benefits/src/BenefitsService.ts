// BenefitsService.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Benefits search, filter, and hidden gems discovery

import type { BenefitV2, BenefitCategory } from '@vetassist/shared-types';
import { BENEFITS_CONFIG } from '@vetassist/shared-config';
import { BENEFITS_SEED } from './benefits-seed.js';

const ALL_CATEGORY = 'all' as const;

export class BenefitsService {
  private readonly benefits: readonly BenefitV2[] = BENEFITS_SEED;

  search(
    query: string,
    category: BenefitCategory | 'all' = ALL_CATEGORY,
    stateCode?: string,
  ): readonly BenefitV2[] {
    const q = query.toLowerCase().trim();

    return this.benefits
      .filter((b) => this.matchesCategory(b, category))
      .filter((b) => !stateCode || b.stateCode === null || b.stateCode === stateCode)
      .filter((b) => !q || this.matchesQuery(b, q))
      .slice(0, BENEFITS_CONFIG.maxSearchResults);
  }

  getById(id: string): BenefitV2 | null {
    return this.benefits.find((b) => b.id === id) ?? null;
  }

  getHiddenGems(): readonly BenefitV2[] {
    return this.benefits
      .filter((b) => b.isHiddenGem)
      .slice(0, BENEFITS_CONFIG.hiddenGemsCount);
  }

  getCategories(): readonly BenefitCategory[] {
    const seen = new Set<BenefitCategory>();
    for (const b of this.benefits) seen.add(b.category);
    return [...seen];
  }

  private matchesCategory(benefit: BenefitV2, category: BenefitCategory | 'all'): boolean {
    return category === ALL_CATEGORY || benefit.category === category;
  }

  private matchesQuery(benefit: BenefitV2, query: string): boolean {
    return (
      benefit.title.toLowerCase().includes(query) ||
      benefit.summary.toLowerCase().includes(query) ||
      benefit.tags.some((t) => t.toLowerCase().includes(query))
    );
  }
}
