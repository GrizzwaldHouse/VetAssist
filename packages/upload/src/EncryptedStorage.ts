// EncryptedStorage.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: AES-256-CBC encrypted temp file storage with 24h TTL enforcement

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { writeFile, unlink, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { eventBus, EVENTS } from '@vetassist/events';
import { UPLOAD_CONFIG } from '@vetassist/shared-config';

const IV_LENGTH = 16;
const KEY_LENGTH = 32;
// Default temp directory — overridden by UPLOAD_TEMP_DIR env var
const TEMP_DIR_DEFAULT = '/tmp/vetassist-uploads';
// Purge cycle runs every 15 minutes — keeps TTL enforcement timely without excessive I/O
const PURGE_INTERVAL_MS = 15 * 60 * 1000;

type StorageRecord = {
  readonly encryptedPath: string;
  readonly iv: string;
  readonly key: string;
  readonly expiresAt: number;
};

export class EncryptedStorage {
  private readonly records = new Map<string, StorageRecord>();
  private readonly tempDir: string;

  constructor() {
    this.tempDir = process.env[UPLOAD_CONFIG.tempDirEnvKey] ?? TEMP_DIR_DEFAULT;
    this.startPurgeCycle();
  }

  async store(documentId: string, buffer: Buffer, _mimeType: string): Promise<void> {
    await mkdir(this.tempDir, { recursive: true });

    const key = randomBytes(KEY_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(UPLOAD_CONFIG.encryptionAlgorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    const filePath = join(this.tempDir, `${documentId}.enc`);
    await writeFile(filePath, encrypted);

    this.records.set(documentId, {
      encryptedPath: filePath,
      iv: iv.toString('hex'),
      key: key.toString('hex'),
      expiresAt: Date.now() + UPLOAD_CONFIG.defaultTtlMs,
    });
  }

  async retrieve(documentId: string): Promise<Buffer | null> {
    const record = this.records.get(documentId);
    if (!record) return null;

    const encrypted = await readFile(record.encryptedPath);
    const key = Buffer.from(record.key, 'hex');
    const iv = Buffer.from(record.iv, 'hex');
    const decipher = createDecipheriv(UPLOAD_CONFIG.encryptionAlgorithm, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  async delete(documentId: string): Promise<void> {
    const record = this.records.get(documentId);
    if (!record) return;

    try {
      await unlink(record.encryptedPath);
    } catch {
      // File may already be deleted externally — treat as success
    }

    this.records.delete(documentId);

    await eventBus.emit(EVENTS.DOCUMENT_DELETED, {
      documentId,
      reason: 'user_request',
    });
  }

  // Overwrites file content with zeros before deletion — prevents data recovery from disk
  async secureWipe(documentId: string): Promise<void> {
    const record = this.records.get(documentId);
    if (!record) return;

    try {
      const encrypted = await readFile(record.encryptedPath);
      // Single-pass zero overwrite — sufficient for non-magnetic storage (SSDs, cloud volumes)
      await writeFile(record.encryptedPath, Buffer.alloc(encrypted.length, 0));
      await unlink(record.encryptedPath);
    } catch {
      // File may already be gone — continue to clear the in-memory record
    }

    this.records.delete(documentId);
  }

  hasDocument(documentId: string): boolean {
    return this.records.has(documentId);
  }

  // Runs on a fixed interval — .unref() prevents the timer from blocking process exit
  private startPurgeCycle(): void {
    setInterval(() => { void this.purgeExpired(); }, PURGE_INTERVAL_MS).unref();
  }

  private async purgeExpired(): Promise<void> {
    const now = Date.now();
    for (const [id, record] of this.records.entries()) {
      if (record.expiresAt <= now) {
        try {
          await unlink(record.encryptedPath);
        } catch {
          // Already gone — no action needed
        }
        this.records.delete(id);
        await eventBus.emit(EVENTS.DOCUMENT_DELETED, { documentId: id, reason: 'ttl_expired' });
      }
    }
  }
}
