// PostHogProvider.tsx
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Initialises posthog-js on the client, respects analytics consent from localStorage

'use client';

import React, { useEffect } from 'react';
import posthog from 'posthog-js';
import { ANALYTICS_CONFIG } from '@vetassist/shared-config';

const POSTHOG_KEY  = process.env['NEXT_PUBLIC_POSTHOG_KEY']  ?? '';
const POSTHOG_HOST = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://app.posthog.com';

interface PostHogProviderProps {
  readonly children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    const raw     = localStorage.getItem(ANALYTICS_CONFIG.consentStorageKey);
    const consent = raw === 'true';

    posthog.init(POSTHOG_KEY, {
      api_host:          POSTHOG_HOST,
      capture_pageview:  false,
      autocapture:       false,
      persistence:       'localStorage',
    });

    if (!consent) {
      posthog.opt_out_capturing();
    }
  }, []);

  return <>{children}</>;
}

// Re-export for consumers that want the posthog instance directly
export { posthog };
