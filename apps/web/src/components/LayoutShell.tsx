// LayoutShell.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Client-boundary wrapper for interactive layout elements — NavSidebar, AccessibilityControls, CrisisLineBanner, OfflineIndicator

'use client';

import React from 'react';
// Direct imports — avoids pulling the full barrel into the server layout tree
// All of these components use hooks and must be in a client boundary
import { CrisisLineBanner }    from '@vetassist/ui-components/src/CrisisLineBanner.js';
import { NavSidebar }          from '@vetassist/ui-components/src/NavSidebar.js';
import { AccessibilityControls } from '@vetassist/ui-components/src/AccessibilityControls.js';
import { OfflineIndicator }    from './OfflineIndicator.js';
import { PostHogProvider }    from '../lib/PostHogProvider.js';

// Nav structure constant — no magic strings in JSX
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { id: 'home',      label: 'Home',      href: '/',          icon: '⌂' },
      { id: 'chat',      label: 'Chat',      href: '/chat',      icon: '◎' },
      { id: 'documents', label: 'Documents', href: '/documents', icon: '☰' },
      { id: 'discover',  label: 'Discover',  href: '/discover',  icon: '✦' },
      { id: 'generate',  label: 'Generate',  href: '/generate',  icon: '✎' },
      { id: 'tracker',   label: 'Tracker',   href: '/tracker',   icon: '◈' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { id: 'learn',   label: 'Learn',      href: '/learn',    icon: '✦' },
      { id: 'faq',     label: 'FAQ',         href: '/faq',      icon: '?' },
      { id: 'vre',     label: 'VR&E Ch.31',  href: '/vre',      icon: '◈' },
      { id: 'impact',  label: 'Our Impact',  href: '/impact',   icon: '◉' },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'settings', label: 'Settings', href: '/settings', icon: '⚙' },
    ],
  },
];

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: 'var(--va-color-background)',
  color: 'var(--va-color-text-primary)',
};

const bodyRowStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  paddingTop: '16px',
};

interface LayoutShellProps {
  readonly children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  return (
    <PostHogProvider>
      <div style={rootStyle}>
        {/* Offline indicator — shown when browser loses network, hidden when online */}
        <OfflineIndicator />

        {/* Crisis line — non-dismissable, highest z-index */}
        <CrisisLineBanner />

        <div style={bodyRowStyle}>
          {/* Left sidebar — active item derived from current pathname */}
          <NavSidebar
            sections={NAV_SECTIONS}
            activeItemId=""
          />

          {/* Page content landmark */}
          <main id="main-content" style={mainStyle}>
            {children}
          </main>
        </div>

        {/* Accessibility FAB — fixed position, outside document flow */}
        <AccessibilityControls />
      </div>
    </PostHogProvider>
  );
}
