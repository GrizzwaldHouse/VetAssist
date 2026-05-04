// useDocumentDraft.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: React hook — debounced auto-save to IndexedDB, draft load on mount,
//          and sync-on-reconnect that POSTs the draft to the API then clears local storage.

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { saveDraft as storeSaveDraft, getDraft, deleteDraft } from '../lib/offlineStore.js';
import { useOfflineStatus } from './useOfflineStatus.js';

// Debounce delay in ms — long enough to avoid thrashing IDB on every keystroke
const DRAFT_DEBOUNCE_MS = 800 as const;
const DRAFT_SYNC_API_PATH = '/api/documents/drafts' as const;

export interface UseDocumentDraftReturn {
  readonly saveDraft:  (key: string, content: string) => void;
  readonly loadDraft:  (key: string) => Promise<string | null>;
  readonly syncDraft:  (key: string) => Promise<void>;
}

export function useDocumentDraft(): UseDocumentDraftReturn {
  const { isOnline, wasOffline } = useOfflineStatus();
  const debounceTimer             = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Internal sync — declared before the useEffect that calls it so the closure captures the real function
  const syncDraftInternal = useCallback(async (key: string): Promise<void> => {
    const draft = await getDraft(key);
    if (draft === null) return;

    // Extract content from the DocumentDraft object
    const content = draft.content;

    try {
      const response = await fetch(DRAFT_SYNC_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, content }),
        credentials: 'include',
      });
      // Only clear local draft when the server confirms receipt
      if (response.ok) {
        await deleteDraft(key);
      }
    } catch {
      // Network failure — draft stays in IDB, will retry on next reconnect
    }
  }, []);

  // Debounced save — clears any pending timer before scheduling a new one
  const save = useCallback((key: string, content: string): void => {
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      void storeSaveDraft(key, content);
    }, DRAFT_DEBOUNCE_MS);
  }, []);

  // Load draft — called by components on mount to restore in-progress work
  const load = useCallback(async (key: string): Promise<string | null> => {
    const draft = await getDraft(key);
    if (draft === null) return null;
    // Return only the content string — callers do not need savedAt or synced metadata
    return draft.content;
  }, []);

  // Public sync — allows components to manually trigger a sync for a specific key
  const sync = useCallback((key: string): Promise<void> => {
    return syncDraftInternal(key);
  }, [syncDraftInternal]);

  // Sync all pending drafts when the user comes back online
  // syncDraftInternal is declared above — stable identity via useCallback, safe in dep array
  useEffect(() => {
    if (!isOnline || !wasOffline) return;

    // Fire-and-forget — sync errors are non-fatal; the draft stays in IDB for the next reconnect
    void (async () => {
      const { getAllDraftKeys } = await import('../lib/offlineStore.js');
      const keys = await getAllDraftKeys();
      await Promise.all(keys.map((key) => syncDraftInternal(key)));
    })();
  }, [wasOffline, isOnline, syncDraftInternal]);

  // Clean up any pending debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current !== null) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return { saveDraft: save, loadDraft: load, syncDraft: sync };
}
