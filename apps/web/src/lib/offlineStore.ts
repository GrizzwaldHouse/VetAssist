// offlineStore.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: IndexedDB wrapper for offline document draft storage — raw IDB API (no idb package required).
//          All keys and store names are named constants. No magic strings.

import type { DocumentDraft } from '@vetassist/shared-types';

const DB_NAME = 'vetassist-offline' as const;
const STORE_NAME = 'document-drafts' as const;
const DB_VERSION = 1 as const;

// Open (or upgrade) the IndexedDB database — returns a typed IDBDatabase promise
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Create the object store on first open or version bump
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror  = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
}

// Persist a DocumentDraft under the given key — overwrites any existing value
export async function saveDraft(key: string, content: string): Promise<void> {
  const draft: DocumentDraft = {
    key,
    content,
    savedAt: new Date().toISOString(),
    synced: false,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.put(draft, key);

    request.onsuccess = () => resolve();
    request.onerror   = (event) => reject((event.target as IDBRequest).error);
  });
}

// Retrieve a DocumentDraft by key — returns null when the key does not exist
export async function getDraft(key: string): Promise<DocumentDraft | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = (event) => {
      const value = (event.target as IDBRequest<DocumentDraft | undefined>).result;
      resolve(value ?? null);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}

// Remove a single draft by key — no-op when key does not exist
export async function deleteDraft(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror   = (event) => reject((event.target as IDBRequest).error);
  });
}

// Return all stored draft keys — used by syncDraft to enumerate pending drafts
export async function getAllDraftKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onsuccess = (event) => {
      const keys = (event.target as IDBRequest<IDBValidKey[]>).result;
      resolve(keys as string[]);
    };
    request.onerror = (event) => reject((event.target as IDBRequest).error);
  });
}
