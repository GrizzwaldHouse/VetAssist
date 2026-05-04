// layout.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Root layout — skip-to-content link, Inter font, LayoutShell client boundary wraps all interactive nav

import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { LayoutShell } from '../components/LayoutShell.js';
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration.js';

// Inter loaded via next/font — optimized, no layout shift
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VetAssist — Your AI Battle Buddy for VA Benefits',
  description: 'Educational AI platform for veterans — document quality assistant, benefits discovery, and community.',
};

// Skip-link style — visually hidden until focused (WCAG 2.1 AA)
const skipLinkStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-40px',
  left: '8px',
  zIndex: 9999,
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: '4px',
  fontWeight: 600,
  fontSize: '14px',
  textDecoration: 'none',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Brings skip-link into view when keyboard-focused — WCAG 2.1 AA requirement */}
        <style>{`.va-skip-link:focus { top: 8px !important; }`}</style>
      </head>
      <body className={inter.className}>
        {/* First focusable element in the DOM — keyboard users skip repetitive nav */}
        <a href="#main-content" className="va-skip-link" style={skipLinkStyle}>
          Skip to main content
        </a>

        {/* ServiceWorkerRegistration runs only in browser — registers sw.js for offline caching */}
        <ServiceWorkerRegistration />

        {/* LayoutShell is a client component — owns CrisisLineBanner, NavSidebar, AccessibilityControls */}
        <LayoutShell>
          {children}
        </LayoutShell>
      </body>
    </html>
  );
}
