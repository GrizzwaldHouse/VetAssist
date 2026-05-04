// ServiceWorkerRegistration.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Client component that registers the Service Worker once on mount.
//          Runs only in the browser — never executes in SSR/Node context.

'use client';

import { useEffect } from 'react';

const SW_PATH = '/sw.js' as const;

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Guard: Service Workers are not available in all environments
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register on mount — browser deduplicates re-registrations automatically
    navigator.serviceWorker
      .register(SW_PATH)
      .catch(() => {
        // Registration failure is non-fatal — app works without the SW
      });
  }, []);

  // Renders nothing — purely a side-effect component
  return null;
}
