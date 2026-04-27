// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Benefit detail page — full description, eligibility rules, application steps, CFR citation

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AIDisclosureBanner, CrisisLineBanner } from '@vetassist/ui-components';
import { apiClient } from '../../../lib/apiClient.js';
import type { BenefitV2 } from '../../../lib/apiClient.js';

// ── Text constants — no inline string literals in JSX ─────────────────────────

const BACK_LINK_LABEL          = '← Back to Discover';
const ROUTE_DISCOVER           = '/discover';
const ELIGIBILITY_HEADING      = 'Eligibility';
const STEPS_HEADING            = 'How to Apply';
const CFR_HEADING              = 'Regulatory Citation';
const OFFICIAL_LINK_LABEL      = 'View on VA.gov';
const LOADING_TEXT             = 'Loading benefit details…';
const ERROR_TEXT               = 'Failed to load benefit details. Please try again.';
const SOURCE_OFFICIAL          = 'Official VA';
const SOURCE_VSO               = 'VSO Verified';
const SOURCE_COMMUNITY         = 'Community';
const NOT_FOUND_TEXT           = 'Benefit not found.';

// ── Source badge colors — keyed to BenefitSource union values ─────────────────

const SOURCE_BADGE_COLORS: Readonly<Record<string, string>> = {
  official_va:  'var(--va-color-score-high)',
  vso_verified: 'var(--va-color-old-glory-blue, #1a2744)',
  community:    'var(--va-color-score-mid)',
};

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  official_va:  SOURCE_OFFICIAL,
  vso_verified: SOURCE_VSO,
  community:    SOURCE_COMMUNITY,
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '800px',
  margin: '0 auto',
  padding: '24px var(--va-space-6)',
  gap: '28px',
};

const backLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
  lineHeight: 1.25,
};

const badgeRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
};

const categoryBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
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
  padding: '3px 10px',
  borderRadius: '3px',
  fontSize: 'var(--va-text-caption)',
  fontFamily: 'var(--va-font-mono)',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  backgroundColor: SOURCE_BADGE_COLORS[source] ?? 'var(--va-color-text-secondary)',
  color: '#fff',
});

const descriptionStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.7,
  margin: 0,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 12px',
  letterSpacing: '0.02em',
};

const listStyle: React.CSSProperties = {
  margin: '0',
  paddingLeft: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const listItemStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.5,
};

const citationBoxStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'var(--va-color-field-blue)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '10px 16px',
};

const citationTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  letterSpacing: '0.02em',
};

const officialLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: '48px',
  padding: '0 28px',
  borderRadius: 'var(--va-radius-card)',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: '#fff',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  textDecoration: 'none',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid var(--va-color-border)',
  margin: 0,
};

const loadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  padding: '40px 0',
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-old-glory-red)',
};

// ── Main page ─────────────────────────────────────────────────────────────────

interface BenefitDetailPageProps {
  // Next.js 14 App Router passes params as a plain object (not a Promise)
  readonly params: { readonly id: string };
}

export default function BenefitDetailPage({ params }: BenefitDetailPageProps) {
  const { id } = params;

  const [benefit, setBenefit]   = useState<BenefitV2 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void apiClient.getBenefitById(id)
      .then(data => {
        if (!cancelled) setBenefit(data);
      })
      .catch(() => {
        if (!cancelled) setError(ERROR_TEXT);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  return (
    <div style={pageStyle}>
      {/* Required on all AI-powered screens */}
      <AIDisclosureBanner />
      <CrisisLineBanner />

      {/* Back navigation */}
      <Link href={ROUTE_DISCOVER} style={backLinkStyle} aria-label="Back to Benefits Discovery Hub">
        {BACK_LINK_LABEL}
      </Link>

      {isLoading && (
        <p style={loadingStyle} aria-busy="true">{LOADING_TEXT}</p>
      )}

      {error && (
        <p style={errorStyle} role="alert">{error}</p>
      )}

      {!isLoading && !error && !benefit && (
        <p style={errorStyle}>{NOT_FOUND_TEXT}</p>
      )}

      {benefit && (
        <>
          {/* Title + badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h1 style={titleStyle}>{benefit.title}</h1>
            <div style={badgeRowStyle}>
              <span style={categoryBadgeStyle}>{benefit.category}</span>
              <span style={sourceBadgeStyle(benefit.source)}>
                {SOURCE_LABELS[benefit.source] ?? benefit.source}
              </span>
            </div>
          </div>

          <hr style={dividerStyle} />

          {/* Full description */}
          <p style={descriptionStyle}>{benefit.description}</p>

          {/* Eligibility rules */}
          {benefit.eligibilityRules.length > 0 && (
            <section aria-label="Eligibility requirements">
              <h2 style={sectionHeadingStyle}>{ELIGIBILITY_HEADING}</h2>
              <ul style={listStyle} aria-label="Eligibility rules list">
                {benefit.eligibilityRules.map((rule, index) => (
                  // index key acceptable here — rules are ordered and static
                  <li key={index} style={listItemStyle}>{rule}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Application steps */}
          {benefit.applicationSteps.length > 0 && (
            <section aria-label="Application steps">
              <h2 style={sectionHeadingStyle}>{STEPS_HEADING}</h2>
              <ol style={listStyle} aria-label="Application steps list">
                {benefit.applicationSteps.map((step, index) => (
                  <li key={index} style={listItemStyle}>{step}</li>
                ))}
              </ol>
            </section>
          )}

          {/* CFR citation */}
          {benefit.cfr && (
            <section aria-label="Regulatory citation">
              <h2 style={sectionHeadingStyle}>{CFR_HEADING}</h2>
              <div style={citationBoxStyle}>
                <span aria-hidden="true" style={{ fontSize: '16px' }}>§</span>
                <span style={citationTextStyle} aria-label={`Code of Federal Regulations: ${benefit.cfr}`}>
                  {benefit.cfr}
                </span>
              </div>
            </section>
          )}

          <hr style={dividerStyle} />

          {/* Official VA link */}
          <div>
            <a
              href={benefit.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={officialLinkStyle}
              aria-label={`${OFFICIAL_LINK_LABEL} — opens in new tab`}
            >
              {OFFICIAL_LINK_LABEL} ↗
            </a>
          </div>
        </>
      )}
    </div>
  );
}
