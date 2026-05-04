// useCachedContent.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Hook — stores and retrieves API responses from AsyncStorage for offline access.
//          Used by screens to display cached benefits, FAQ, etc. when network is unavailable.

import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key prefix to namespace cached content away from drafts and other AsyncStorage consumers
const CACHE_KEY_PREFIX    = 'vetassist:cache:' as const;
const CACHE_KEY_BENEFITS  = 'benefits' as const;
const CACHE_KEY_FAQ       = 'faq' as const;

function buildCacheKey(key: string): string {
  return `${CACHE_KEY_PREFIX}${key}`;
}

export interface UseCachedContentReturn {
  readonly getCachedBenefits: () => Promise<unknown | null>;
  readonly getCachedFAQ:      () => Promise<unknown | null>;
  readonly cacheContent:      (key: string, data: unknown) => Promise<void>;
}

export function useCachedContent(): UseCachedContentReturn {
  // Retrieve cached benefits — returns null when no cached data exists
  const getCachedBenefits = useCallback(async (): Promise<unknown | null> => {
    const raw = await AsyncStorage.getItem(buildCacheKey(CACHE_KEY_BENEFITS));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }, []);

  // Retrieve cached FAQ — returns null when no cached data exists
  const getCachedFAQ = useCallback(async (): Promise<unknown | null> => {
    const raw = await AsyncStorage.getItem(buildCacheKey(CACHE_KEY_FAQ));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }, []);

  // Store any API response under the given content key for later offline retrieval
  const cacheContent = useCallback(async (key: string, data: unknown): Promise<void> => {
    await AsyncStorage.setItem(buildCacheKey(key), JSON.stringify(data));
  }, []);

  return { getCachedBenefits, getCachedFAQ, cacheContent };
}
