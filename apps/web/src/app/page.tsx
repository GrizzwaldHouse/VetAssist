// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Home page — server component, renders HomeHero and two CTA navigation buttons

import React from 'react';
import Link from 'next/link';
// HomeHeroClient wraps HomeHero in a 'use client' boundary — HomeHero has event handlers
// that cannot be serialized across the server/client boundary during SSG
import { HomeHeroClient } from '../components/HomeHeroClient.js';

// Route constants — no magic strings in JSX
const ROUTE_CHAT      = '/chat';
const ROUTE_DOCUMENTS = '/documents';

// Button label constants
const LABEL_START_CHAT     = 'Start a Conversation';
const LABEL_REVIEW_DOCUMENT = 'Review a Document';

// Aria label constants
const ARIA_CHAT_CTA = 'Start a conversation about VA benefits';
const ARIA_DOC_CTA  = 'Upload and review a VA document';

const ctaRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
  padding: '40px var(--va-space-10)',
};

const primaryButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: 'var(--va-color-crisis-text)',
  border: 'none',
  borderRadius: 'var(--va-radius-card)',
  padding: '14px 32px',
  minHeight: '48px',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};

const secondaryButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  backgroundColor: 'transparent',
  color: 'var(--va-color-text-primary)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '14px 32px',
  minHeight: '48px',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
};

// No AI features on the home page — no AIDisclosureBanner required here
export default function HomePage() {
  return (
    <>
      <HomeHeroClient />

      <section aria-label="Get started">
        <div style={ctaRowStyle}>
          {/* Primary CTA — go to chat */}
          <Link
            href={ROUTE_CHAT}
            style={primaryButtonStyle}
            aria-label={ARIA_CHAT_CTA}
          >
            {LABEL_START_CHAT}
          </Link>

          {/* Secondary CTA — go to documents (placeholder route) */}
          <Link
            href={ROUTE_DOCUMENTS}
            style={secondaryButtonStyle}
            aria-label={ARIA_DOC_CTA}
          >
            {LABEL_REVIEW_DOCUMENT}
          </Link>
        </div>
      </section>
    </>
  );
}
