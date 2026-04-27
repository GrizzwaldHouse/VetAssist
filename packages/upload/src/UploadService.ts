// UploadService.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Orchestrates file upload pipeline: validate → OCR → PII scrub → encrypt → store

import { randomUUID } from 'crypto';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { UPLOAD_CONFIG } from '@vetassist/shared-config';
import type { UploadedDocument, AcceptedMimeType } from '@vetassist/shared-types';
import { OCRService } from './OCRService.js';
import { EncryptedStorage } from './EncryptedStorage.js';

const INVALID_MIME_TYPE_MSG = 'File type not accepted. Upload PDF, JPEG, PNG, HEIC, TIFF, .docx, or .txt';
const FILE_TOO_LARGE_MSG = 'File exceeds 10 MB limit';

export class UploadService {
  private readonly ocrService = new OCRService();
  private readonly storage = new EncryptedStorage();

  async processUpload(
    buffer: Buffer,
    mimeType: string,
    originalFilename: string,
  ): Promise<UploadedDocument> {
    this.validateMimeType(mimeType);
    this.validateSize(buffer);

    const documentId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + UPLOAD_CONFIG.defaultTtlMs);

    // Extract text via OCR (or direct read for text files)
    const rawText = await this.ocrService.extractText(buffer, mimeType as AcceptedMimeType);

    // PII scrub extracted text — PIIDetector.scan is synchronous
    const piiResult = PIIDetector.scan(rawText);
    const extractedText = piiResult.hasPII ? piiResult.sanitizedText : rawText;
    const piiRedacted = piiResult.hasPII;

    // Encrypt and store original buffer
    await this.storage.store(documentId, buffer, mimeType);

    const document: UploadedDocument = {
      id: documentId,
      originalFilename,
      mimeType: mimeType as AcceptedMimeType,
      status: 'ready',
      extractedText,
      piiRedacted,
      uploadedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      sizeBytes: buffer.length,
      error: null,
    };

    await eventBus.emit(EVENTS.DOCUMENT_UPLOADED, {
      documentId,
      filename: originalFilename,
      mimeType,
    });

    await eventBus.emit(EVENTS.OCR_COMPLETED, {
      documentId,
      charCount: extractedText?.length ?? 0,
    });

    // If PII was found, emit PII_DETECTED for audit trail — never logs the actual value
    if (piiRedacted) {
      for (const piiType of piiResult.detectedTypes) {
        await eventBus.emit(EVENTS.PII_DETECTED, {
          eventId: randomUUID(),
          type: piiType,
          location: 'document_upload',
          action: 'redacted',
          timestamp: now.toISOString(),
          detectionLayer: 'client_regex',
        });
      }
    }

    return document;
  }

  private validateMimeType(mimeType: string): void {
    const allowed: readonly string[] = UPLOAD_CONFIG.allowedMimeTypes;
    if (!allowed.includes(mimeType)) {
      throw new Error(INVALID_MIME_TYPE_MSG);
    }
  }

  private validateSize(buffer: Buffer): void {
    if (buffer.length > UPLOAD_CONFIG.maxFileSizeBytes) {
      throw new Error(FILE_TOO_LARGE_MSG);
    }
  }
}
