// useOfflineDraft.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: React Native hook — saves/loads/clears document drafts via AsyncStorage.
//          Syncs all pending drafts to the API on reconnect.

import { useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetworkStatus } from './useNetworkStatus';

// Prefix all draft keys to avoid collisions with other AsyncStorage consumers
const DRAFT_KEY_PREFIX = 'vetassist:draft:' as const;
const DRAFTS_INDEX_KEY = 'vetassist:drafts:index' as const;
const DRAFT_SYNC_API_PATH = '/api/documents/drafts' as const;

// Build the full AsyncStorage key for a given logical draft key
function buildStorageKey(key: string): string {
  return `${DRAFT_KEY_PREFIX}${key}`;
}

export interface UseOfflineDraftReturn {
  readonly saveDraft:          (key: string, content: string) => Promise<void>;
  readonly loadDraft:          (key: string) => Promise<string | null>;
  readonly clearDraft:         (key: string) => Promise<void>;
  readonly syncPendingDrafts:  () => Promise<void>;
}

export function useOfflineDraft(): UseOfflineDraftReturn {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Read the index of all draft keys stored in AsyncStorage
  // Declared before any callback that depends on it
  const getDraftIndex = useCallback(async (): Promise<string[]> => {
    const raw = await AsyncStorage.getItem(DRAFTS_INDEX_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }, []);

  // Write an updated index of all draft keys
  const setDraftIndex = useCallback(async (keys: string[]): Promise<void> => {
    await AsyncStorage.setItem(DRAFTS_INDEX_KEY, JSON.stringify(keys));
  }, []);

  // Save a draft and register its key in the index
  const saveDraft = useCallback(async (key: string, content: string): Promise<void> => {
    await AsyncStorage.setItem(buildStorageKey(key), content);
    const index = await getDraftIndex();
    if (!index.includes(key)) {
      await setDraftIndex([...index, key]);
    }
  }, [getDraftIndex, setDraftIndex]);

  // Load a single draft — returns null when key does not exist
  const loadDraft = useCallback(async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(buildStorageKey(key));
  }, []);

  // Remove a single draft and unregister it from the index
  const clearDraft = useCallback(async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(buildStorageKey(key));
    const index = await getDraftIndex();
    await setDraftIndex(index.filter((k) => k !== key));
  }, [getDraftIndex, setDraftIndex]);

  // POST all pending drafts to the API and clear each one on success
  // Declared before the useEffect that calls it so the closure captures the real function
  const syncPendingDrafts = useCallback(async (): Promise<void> => {
    const index = await getDraftIndex();
    await Promise.all(
      index.map(async (key) => {
        const content = await AsyncStorage.getItem(buildStorageKey(key));
        if (content === null) return;
        try {
          // TODO: add Authorization header once mobile auth token store is implemented (Task 4.x)
          const response = await fetch(DRAFT_SYNC_API_PATH, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, content }),
          });
          // Only clear local draft when the server confirms receipt
          if (response.ok) {
            await clearDraft(key);
          }
        } catch {
          // Network failure — draft stays in AsyncStorage, retried on next reconnect
        }
      }),
    );
  }, [getDraftIndex, clearDraft]);

  // Sync all pending drafts automatically when reconnected
  // syncPendingDrafts is declared above — stable identity via useCallback, safe in dep array
  useEffect(() => {
    if (!isOnline || !wasOffline) return;
    void syncPendingDrafts();
  }, [wasOffline, isOnline, syncPendingDrafts]);

  return { saveDraft, loadDraft, clearDraft, syncPendingDrafts };
}
