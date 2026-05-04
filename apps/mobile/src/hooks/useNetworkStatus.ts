// useNetworkStatus.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: React Native hook — subscribes to NetInfo state changes (no polling).
//          Returns isOnline and wasOffline flag for sync-on-reconnect logic.

import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { OfflineStatus } from '@vetassist/shared-types';

export function useNetworkStatus(): OfflineStatus {
  const [isOnline, setIsOnline]     = useState<boolean>(true);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  // Track whether we have gone offline at least once — used to gate the wasOffline signal
  const wentOfflineRef = useRef<boolean>(false);

  useEffect(() => {
    // Subscribe to connectivity changes — NetInfo fires on every state transition
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;

      if (connected) {
        setIsOnline(true);
        // Signal wasOffline only when we genuinely went offline first — avoids false sync on initial mount
        if (wentOfflineRef.current) {
          setWasOffline(true);
        }
      } else {
        // Record the offline transition and arm the reconnect flag
        wentOfflineRef.current = true;
        setIsOnline(false);
        setWasOffline(false);
      }
    });

    // Clean up subscription on unmount — no polling, no leaks
    return () => unsubscribe();
  }, []);

  return { isOnline, wasOffline };
}
