// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Benefits Discovery Hub — hidden gems carousel, category-filtered grid, state selector

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AIDisclosureBanner, CrisisLineBanner } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type { BenefitV2 } from '../../lib/apiClient.js';

// ── Page-level text constants — no inline string literals in JSX ───────────────

const PAGE_HEADING             = 'Benefits Discovery Hub';
const PAGE_SUBHEADING          = 'Uncover the benefits you\'ve earned — search, filter, and explore by state';
const HIDDEN_GEMS_HEADING      = 'Hidden Gems — Benefits Veterans Often Miss';
const SEARCH_PLACEHOLDER       = 'Search benefits (e.g. "PTSD housing" or "education stipend")…';
const STATE_LABEL              = 'Find benefits in your state';
const STATE_DEFAULT_OPTION     = 'All States (Federal)';
const LEARN_MORE_LABEL         = 'Learn More';
const NO_RESULTS_TEXT          = 'No benefits matched your search. Try broader terms or a different category.';
const LOADING_TEXT             = 'Loading benefits…';
const ERROR_TEXT               = 'Failed to load benefits. Please try again.';
const SOURCE_OFFICIAL          = 'Official VA';
const SOURCE_VSO               = 'VSO Verified';
const SOURCE_COMMUNITY         = 'Community';
const HIDDEN_GEM_BADGE         = 'Hidden Gem';
const DEBOUNCE_MS              = 300;

// ── Category tab constants — must match BenefitCategory union in shared-types ──

const CATEGORY_ALL = 'all';

const CATEGORY_TABS: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
  { id: CATEGORY_ALL,   label: 'All' },
  { id: 'healthcare',   label: 'Healthcare' },
  { id: 'education',    label: 'Education' },
  { id: 'housing',      label: 'Housing' },
  { id: 'employment',   label: 'Employment' },
  { id: 'compensation', label: 'Compensation' },
  { id: 'pension',      label: 'Pension' },
  { id: 'insurance',    label: 'Insurance' },
  { id: 'burial',       label: 'Burial' },
  { id: 'family',       label: 'Family' },
  { id: 'transition',   label: 'Transition' },
];

// ── US state list — 50 states + DC ────────────────────────────────────────────

const US_STATES: ReadonlyArray<{ readonly code: string; readonly name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// ── Source badge colors — keyed to BenefitSource union values ─────────────────

const SOURCE_BADGE_COLORS: Readonly<Record<string, string>> = {
  official_va:   'var(--va-color-score-high)',
  vso_verified:  'var(--va-color-old-glory-blue, #1a2744)',
  community:     'var(--va-color-score-mid)',
};

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  official_va:   SOURCE_OFFICIAL,
  vso_verified:  SOURCE_VSO,
  community:     SOURCE_COMMUNITY,
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '24px var(--va-space-6)',
  gap: '32px',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
};

const subheadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  margin: '4px 0 0',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 16px',
  letterSpacing: '0.02em',
};

const carouselRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  gap: '16px',
  overflowX: 'auto',
  paddingBottom: '8px',
  scrollbarWidth: 'thin',
};

const gemCardStyle: React.CSSProperties = {
  flexShrink: 0,
  width: '260px',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const benefitsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '16px',
};

const benefitCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
  lineHeight: 1.3,
};

// React.CSSProperties does not include WebkitBoxOrient — cast to allow vendor prefix
const cardSummaryStyle = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  margin: 0,
  lineHeight: 1.5,
  // Clamp to 3 lines for grid layout consistency
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as React.CSSProperties;

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
};

const categoryBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontSize: 'var(--va-text-caption)',
  fontFamily: 'var(--va-font-mono)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  backgroundColor: 'var(--va-color-field-blue)',
  color: 'var(--va-color-text-secondary)',
  border: '1px solid var(--va-color-border)',
};

const sourceBadgeStyle = (source: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontSize: 'var(--va-text-caption)',
  fontFamily: 'var(--va-font-mono)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  backgroundColor: SOURCE_BADGE_COLORS[source] ?? 'var(--va-color-text-secondary)',
  color: '#fff',
});

const hiddenGemBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontSize: 'var(--va-text-caption)',
  fontFamily: 'var(--va-font-mono)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: '#fff',
};

const learnMoreLinkStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  marginTop: 'auto',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-old-glory-red)',
  textDecoration: 'none',
  borderBottom: '1px solid transparent',
};

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '0 16px',
  boxSizing: 'border-box',
  outline: 'none',
};

const tabsRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const tabBase: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  cursor: 'pointer',
  backgroundColor: 'var(--va-color-aged-canvas)',
  color: 'var(--va-color-text-primary)',
};

const tabActiveStyle: React.CSSProperties = {
  ...tabBase,
  backgroundColor: 'var(--va-color-old-glory-blue, #1a2744)',
  color: 'var(--va-color-star-white)',
  border: '1px solid transparent',
};

const stateRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const stateLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  color: 'var(--va-color-text-primary)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const stateSelectStyle: React.CSSProperties = {
  height: '44px',
  maxWidth: '360px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '0 12px',
};

const loadingGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: '16px',
};

const skeletonCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '16px',
  height: '160px',
  opacity: 0.5,
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-old-glory-red)',
};

const emptyStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  padding: '24px 0',
};

// ── Skeleton count for loading state ──────────────────────────────────────────

const SKELETON_COUNT = 6;

// ── Sub-components ────────────────────────────────────────────────────────────

const BenefitCard = React.memo(function BenefitCard({
  benefit,
  compact = false,
}: {
  readonly benefit: BenefitV2;
  readonly compact?: boolean;
}) {
  return (
    <div style={compact ? gemCardStyle : benefitCardStyle} aria-label={benefit.title}>
      <div style={badgeRowStyle}>
        <span style={categoryBadgeStyle}>{benefit.category}</span>
        <span style={sourceBadgeStyle(benefit.source)}>
          {SOURCE_LABELS[benefit.source] ?? benefit.source}
        </span>
        {benefit.isHiddenGem && (
          <span style={hiddenGemBadgeStyle}>{HIDDEN_GEM_BADGE}</span>
        )}
      </div>
      <h3 style={cardTitleStyle}>{benefit.title}</h3>
      <p style={cardSummaryStyle}>{benefit.summary}</p>
      <Link
        href={`/discover/${benefit.id}`}
        style={learnMoreLinkStyle}
        aria-label={`Learn more about ${benefit.title}`}
      >
        {LEARN_MORE_LABEL} →
      </Link>
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [benefits, setBenefits]         = useState<BenefitV2[]>([]);
  const [hiddenGems, setHiddenGems]     = useState<BenefitV2[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isGemsLoading, setIsGemsLoading] = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORY_ALL);
  const [selectedState, setSelectedState]   = useState<string>('');

  // Debounce ref — holds the timeout ID across renders without re-subscribing effects
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch hidden gems once on mount — not tied to search/filter state
  useEffect(() => {
    let cancelled = false;
    setIsGemsLoading(true);

    void apiClient.getHiddenGems()
      .then(gems => {
        if (!cancelled) setHiddenGems(gems);
      })
      .catch(() => {
        // Hidden gems failure is non-blocking — main grid still renders
        if (!cancelled) setHiddenGems([]);
      })
      .finally(() => {
        if (!cancelled) setIsGemsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // Debounced fetch when query, category, or state changes
  const fetchBenefits = useCallback((query: string, category: string, state: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      const categoryArg = category === CATEGORY_ALL ? undefined : category;
      const stateArg    = state || undefined;

      void apiClient.searchBenefits(query, categoryArg, stateArg)
        .then(results => {
          setBenefits(results);
        })
        .catch(() => {
          setError(ERROR_TEXT);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);
  }, []);

  // Re-fetch whenever any filter changes
  useEffect(() => {
    fetchBenefits(searchQuery, activeCategory, selectedState);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, activeCategory, selectedState, fetchBenefits]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleCategoryChange = useCallback((id: string) => {
    setActiveCategory(id);
  }, []);

  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
  }, []);

  return (
    <div style={pageStyle}>
      {/* Required on all AI-powered screens */}
      <AIDisclosureBanner />

      {/* Crisis line is always present — layout shell also renders it, this is defense in depth */}
      <CrisisLineBanner />

      {/* Page header */}
      <div>
        <h1 style={headingStyle}>{PAGE_HEADING}</h1>
        <p style={subheadingStyle}>{PAGE_SUBHEADING}</p>
      </div>

      {/* Section 1 — Hidden Gems Carousel */}
      <section aria-label="Hidden gems — benefits veterans often miss">
        <h2 style={sectionHeadingStyle}>{HIDDEN_GEMS_HEADING}</h2>
        {isGemsLoading ? (
          <div style={{ ...carouselRowStyle }}>
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                style={{ ...gemCardStyle, opacity: 0.4, height: '140px' }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : (
          <div style={carouselRowStyle} role="list" aria-label="Hidden gem benefits">
            {hiddenGems.map(gem => (
              <div key={gem.id} role="listitem">
                <BenefitCard benefit={gem} compact />
              </div>
            ))}
            {hiddenGems.length === 0 && (
              <p style={emptyStyle}>No hidden gems loaded yet.</p>
            )}
          </div>
        )}
      </section>

      {/* Section 2 — Search + Category Tabs + Benefits Grid */}
      <section aria-label="Benefits search and filter">
        <div style={controlsRowStyle}>
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={SEARCH_PLACEHOLDER}
            style={searchInputStyle}
            aria-label="Search benefits"
          />

          {/* Category filter chips */}
          <div style={tabsRowStyle} role="group" aria-label="Filter by category">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                style={activeCategory === tab.id ? tabActiveStyle : tabBase}
                onClick={() => handleCategoryChange(tab.id)}
                aria-pressed={activeCategory === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Benefits grid */}
        <div style={{ marginTop: '24px' }}>
          {isLoading ? (
            <div style={loadingGridStyle} aria-busy="true" aria-label={LOADING_TEXT}>
              {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                <div key={i} style={skeletonCardStyle} aria-hidden="true" />
              ))}
            </div>
          ) : error ? (
            <p style={errorStyle} role="alert">{error}</p>
          ) : benefits.length === 0 ? (
            <p style={emptyStyle}>{NO_RESULTS_TEXT}</p>
          ) : (
            <div style={benefitsGridStyle} role="list" aria-label="Benefits results">
              {benefits.map(benefit => (
                <div key={benefit.id} role="listitem">
                  <BenefitCard benefit={benefit} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 3 — State Benefits Module */}
      <section aria-label="Filter benefits by state">
        <div style={stateRowStyle}>
          <label htmlFor="state-select" style={stateLabelStyle}>{STATE_LABEL}</label>
          <select
            id="state-select"
            value={selectedState}
            onChange={handleStateChange}
            style={stateSelectStyle}
            aria-label="Select your state"
          >
            <option value="">{STATE_DEFAULT_OPTION}</option>
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}
