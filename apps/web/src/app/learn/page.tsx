// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-26
// Purpose: Learning Hub — curated veteran education resources with topic/type/difficulty filters and keyword search

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AIDisclosureBanner, CrisisLineBanner } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type { LearningResource, LearningResourceTopic, LearningResourceType, LearningDifficultyLevel } from '../../lib/apiClient.js';

// ── Page-level text constants ──────────────────────────────────────────────────

const PAGE_HEADING       = 'Learning Hub';
const PAGE_SUBHEADING    = 'Curated guides, articles, and videos to help you understand your benefits';
const SEARCH_PLACEHOLDER = 'Search resources (e.g. "nexus letter" or "C&P exam")…';
const LOADING_TEXT       = 'Loading resources…';
const ERROR_TEXT         = 'Failed to load resources. Please try again.';
const NO_RESULTS_TEXT    = 'No resources matched your filters. Try adjusting your search or clearing filters.';
const VERIFIED_LABEL     = 'Verified';
const TAKEAWAYS_HEADING  = 'Key Takeaways';
const SOURCE_LABEL       = 'Source';
const VISIT_LABEL        = 'Visit Resource →';
const CLEAR_FILTERS      = 'Clear Filters';
const DEBOUNCE_MS        = 300;
const SKELETON_COUNT     = 6;

// ── Filter option constants ────────────────────────────────────────────────────

const TOPIC_OPTIONS: ReadonlyArray<{ readonly value: LearningResourceTopic | ''; readonly label: string }> = [
  { value: '',                       label: 'All Topics' },
  { value: 'disability_compensation', label: 'Disability Compensation' },
  { value: 'appeals',                label: 'Appeals' },
  { value: 'healthcare',             label: 'Healthcare' },
  { value: 'education',              label: 'Education & GI Bill' },
  { value: 'housing',                label: 'Housing' },
  { value: 'employment',             label: 'Employment' },
  { value: 'transition',             label: 'Transition' },
  { value: 'general',               label: 'General' },
];

const TYPE_OPTIONS: ReadonlyArray<{ readonly value: LearningResourceType | ''; readonly label: string }> = [
  { value: '',        label: 'All Types' },
  { value: 'guide',   label: 'Guides' },
  { value: 'article', label: 'Articles' },
  { value: 'video',   label: 'Videos' },
  { value: 'tool',    label: 'Tools' },
];

const DIFFICULTY_OPTIONS: ReadonlyArray<{ readonly value: LearningDifficultyLevel | ''; readonly label: string }> = [
  { value: '',             label: 'All Levels' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
];

// ── Type icon map — no emoji unless explicitly requested, using text labels ────

const TYPE_LABELS: Readonly<Record<LearningResourceType, string>> = {
  guide:   'GUIDE',
  article: 'ARTICLE',
  video:   'VIDEO',
  tool:    'TOOL',
};

const DIFFICULTY_COLORS: Readonly<Record<LearningDifficultyLevel, string>> = {
  beginner:     'var(--va-color-score-high)',
  intermediate: 'var(--va-color-score-mid)',
  advanced:     'var(--va-color-old-glory-red)',
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

const filtersRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  alignItems: 'flex-end',
};

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  flexGrow: 1,
  minWidth: '180px',
};

const filterLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-caption)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--va-color-text-secondary)',
};

const selectStyle: React.CSSProperties = {
  height: '44px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '0 12px',
  width: '100%',
};

const searchInputStyle: React.CSSProperties = {
  height: '44px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '0 16px',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

const clearButtonStyle: React.CSSProperties = {
  height: '44px',
  alignSelf: 'flex-end',
  padding: '0 16px',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-text-secondary)',
  backgroundColor: 'transparent',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const resourcesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '20px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '8px',
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
  lineHeight: 1.3,
  flexGrow: 1,
};

const cardDescStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  margin: 0,
  lineHeight: 1.5,
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '6px',
  flexWrap: 'wrap',
};

const baseBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontSize: 'var(--va-text-caption)',
  fontFamily: 'var(--va-font-mono)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const typeBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  backgroundColor: 'var(--va-color-field-blue)',
  color: 'var(--va-color-text-secondary)',
  border: '1px solid var(--va-color-border)',
};

const verifiedBadgeStyle: React.CSSProperties = {
  ...baseBadgeStyle,
  backgroundColor: 'var(--va-color-score-high)',
  color: '#fff',
};

const difficultyBadgeStyle = (level: LearningDifficultyLevel): React.CSSProperties => ({
  ...baseBadgeStyle,
  backgroundColor: DIFFICULTY_COLORS[level],
  color: '#fff',
});

const takeawaysSectionStyle: React.CSSProperties = {
  borderTop: '1px solid var(--va-color-border)',
  paddingTop: '12px',
};

const takeawaysHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--va-color-text-secondary)',
  margin: '0 0 8px',
};

const takeawayListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const takeawayItemStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.5,
};

const sourceRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 'auto',
  paddingTop: '4px',
};

const sourceNameStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
};

const visitLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-old-glory-red)',
  textDecoration: 'none',
};

const skeletonGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: '20px',
};

const skeletonCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px',
  height: '200px',
  opacity: 0.4,
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

const resultCountStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  letterSpacing: '0.04em',
};

// ── ResourceCard sub-component ────────────────────────────────────────────────

const ResourceCard = React.memo(function ResourceCard({
  resource,
}: {
  readonly resource: LearningResource;
}) {
  return (
    <article style={cardStyle} aria-label={resource.title}>
      <div style={cardHeaderStyle}>
        <h2 style={cardTitleStyle}>{resource.title}</h2>
      </div>

      <div style={badgeRowStyle}>
        <span style={typeBadgeStyle}>{TYPE_LABELS[resource.type]}</span>
        <span style={difficultyBadgeStyle(resource.difficultyLevel)}>{resource.difficultyLevel}</span>
        {resource.isVerified && (
          <span style={verifiedBadgeStyle}>{VERIFIED_LABEL}</span>
        )}
      </div>

      <p style={cardDescStyle}>{resource.description}</p>

      {resource.keyTakeaways.length > 0 && (
        <div style={takeawaysSectionStyle}>
          <p style={takeawaysHeadingStyle}>{TAKEAWAYS_HEADING}</p>
          <ul style={takeawayListStyle}>
            {resource.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} style={takeawayItemStyle}>{takeaway}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={sourceRowStyle}>
        <span style={sourceNameStyle}>{SOURCE_LABEL}: {resource.sourceName}</span>
        <a
          href={resource.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={visitLinkStyle}
          aria-label={`Visit resource: ${resource.title} (opens in new tab)`}
        >
          {VISIT_LABEL}
        </a>
      </div>
    </article>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [resources, setResources]     = useState<LearningResource[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [topic, setTopic]             = useState<LearningResourceTopic | ''>('');
  const [type, setType]               = useState<LearningResourceType | ''>('');
  const [difficulty, setDifficulty]   = useState<LearningDifficultyLevel | ''>('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResources = useCallback((
    q: string,
    t: LearningResourceTopic | '',
    rt: LearningResourceType | '',
    d: LearningDifficultyLevel | '',
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      void apiClient.listLearningResources(
        t || undefined,
        rt || undefined,
        d || undefined,
        q.trim() || undefined,
      )
        .then(result => {
          setResources(result.resources as LearningResource[]);
          setTotalCount(result.totalCount);
        })
        .catch(() => {
          setError(ERROR_TEXT);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    fetchResources(searchQuery, topic, type, difficulty);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, topic, type, difficulty, fetchResources]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleTopicChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopic(e.target.value as LearningResourceTopic | '');
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setType(e.target.value as LearningResourceType | '');
  }, []);

  const handleDifficultyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDifficulty(e.target.value as LearningDifficultyLevel | '');
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setTopic('');
    setType('');
    setDifficulty('');
  }, []);

  const hasActiveFilters = searchQuery.trim() !== '' || topic !== '' || type !== '' || difficulty !== '';

  return (
    <div style={pageStyle}>
      {/* Required on all AI-powered screens */}
      <AIDisclosureBanner />

      {/* Crisis line — defense in depth */}
      <CrisisLineBanner />

      {/* Page header */}
      <div>
        <h1 style={headingStyle}>{PAGE_HEADING}</h1>
        <p style={subheadingStyle}>{PAGE_SUBHEADING}</p>
      </div>

      {/* Filters */}
      <section aria-label="Filter learning resources">
        <div style={filtersRowStyle}>
          {/* Keyword search */}
          <div style={{ ...filterGroupStyle, flexGrow: 2, minWidth: '240px' }}>
            <label htmlFor="search-input" style={filterLabelStyle}>Search</label>
            <input
              id="search-input"
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={SEARCH_PLACEHOLDER}
              style={searchInputStyle}
              aria-label="Search learning resources"
            />
          </div>

          {/* Topic filter */}
          <div style={filterGroupStyle}>
            <label htmlFor="topic-select" style={filterLabelStyle}>Topic</label>
            <select
              id="topic-select"
              value={topic}
              onChange={handleTopicChange}
              style={selectStyle}
              aria-label="Filter by topic"
            >
              {TOPIC_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div style={filterGroupStyle}>
            <label htmlFor="type-select" style={filterLabelStyle}>Type</label>
            <select
              id="type-select"
              value={type}
              onChange={handleTypeChange}
              style={selectStyle}
              aria-label="Filter by resource type"
            >
              {TYPE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Difficulty filter */}
          <div style={filterGroupStyle}>
            <label htmlFor="difficulty-select" style={filterLabelStyle}>Level</label>
            <select
              id="difficulty-select"
              value={difficulty}
              onChange={handleDifficultyChange}
              style={selectStyle}
              aria-label="Filter by difficulty level"
            >
              {DIFFICULTY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Clear filters — only shown when filters are active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              style={clearButtonStyle}
              aria-label="Clear all filters"
            >
              {CLEAR_FILTERS}
            </button>
          )}
        </div>
      </section>

      {/* Results area */}
      <section aria-label="Learning resources">
        {isLoading ? (
          <div style={skeletonGridStyle} aria-busy="true" aria-label={LOADING_TEXT}>
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div key={i} style={skeletonCardStyle} aria-hidden="true" />
            ))}
          </div>
        ) : error ? (
          <p style={errorStyle} role="alert">{error}</p>
        ) : resources.length === 0 ? (
          <p style={emptyStyle}>{NO_RESULTS_TEXT}</p>
        ) : (
          <>
            <p style={resultCountStyle} aria-live="polite">
              {totalCount} {totalCount === 1 ? 'resource' : 'resources'} found
            </p>
            <div style={{ ...resourcesGridStyle, marginTop: '16px' }} role="list" aria-label="Learning resources">
              {resources.map(resource => (
                <div key={resource.id} role="listitem">
                  <ResourceCard resource={resource} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
