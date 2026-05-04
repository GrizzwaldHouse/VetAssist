// useOfflineStatus.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: React hook — subscribes to browser online/offline events (no polling).
//          Returns current network status and a wasOffline flag for sync-on-reconnect logic.

'use client';

import { useEffect, useState } from 'react';
import type { OfflineStatus } from '@vetassist/shared-types';

// Initial state reads navigator.onLine at mount time — safe for SSR (defaults true when window absent)
function getInitialOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline]     = useState<boolean>(getInitialOnline);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    // Mark as back online and record that we were offline (triggers sync in callers)
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
    };

    // Mark as offline — reset wasOffline so the next reconnect fires a fresh sync
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up listeners on unmount — no polling, no leaks
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
}
