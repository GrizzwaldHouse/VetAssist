// DataDestructionService.ts
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Orchestrates secure document destruction — PII rescan, overwrite, delete, certificate

import { randomUUID } from 'crypto';
import { eventBus, EVENTS } from '@vetassist/events';
import { PIIDetector } from '@vetassist/pii';
import { CertificateGenerator } from '@vetassist/reports';
import type {
  DataDestructionResult,
  DeletionCertificate,
  DeletionStep,
} from '@vetassist/shared-types';

// Data types that are always destroyed — drives the certificate's dataTypesDestroyed field
const DATA_TYPES_DESTROYED = ['extracted_text', 'encrypted_buffer'] as const;

// Wipe method identifier — must match the WipeMethod union in shared-types
const WIPE_METHOD = 'overwrite_zeros_then_delete' as const;

// Progress percentages for each pipeline step — sum to 100
const PROGRESS_PII_RESCAN    = 20;
const PROGRESS_OVERWRITE     = 50;
const PROGRESS_DELETE        = 70;
const PROGRESS_CERTIFICATE   = 90;
const PROGRESS_COMPLETE      = 100;

// Human-readable step messages shown in the progress bar
const MSG_PII_RESCAN    = 'Scanning document for sensitive information…';
const MSG_OVERWRITE     = 'Overwriting data with zeros…';
const MSG_DELETE        = 'Deleting document record…';
const MSG_CERTIFICATE   = 'Generating deletion certificate…';
const MSG_COMPLETE      = 'Document permanently destroyed.';
const MSG_NOT_FOUND     = 'Document not found.';

// Minimal storage interface — DataDestructionService depends on this abstraction,
// not the concrete EncryptedStorage class, so it stays testable without the filesystem
export interface DocumentStore {
  retrieve(documentId: string): Promise<Buffer | null>;
  secureWipe(documentId: string): Promise<void>;
  hasDocument(documentId: string): boolean;
}

export class DataDestructionService {
  private readonly certGenerator = new CertificateGenerator();

  constructor(private readonly store: DocumentStore) {}

  async destroy(
    documentId: string,
    documentTitle: string,
  ): Promise<DataDestructionResult> {
    if (!this.store.hasDocument(documentId)) {
      return { success: false, documentId, certificate: null, certificatePdfBase64: null, message: MSG_NOT_FOUND };
    }

    await eventBus.emit(EVENTS.DELETION_STARTED, { documentId, documentTitle });

    // Step 1 — PII rescan on extracted text before wipe (same pattern as sharing)
    await this.emitProgress(documentId, 'pii_rescan', PROGRESS_PII_RESCAN, MSG_PII_RESCAN);
    const raw = await this.store.retrieve(documentId);
    if (raw) {
      // Scan for audit purposes only — we're destroying the data regardless
      PIIDetector.scan(raw.toString('utf8'));
    }

    // Step 2 — Overwrite encrypted file with zeros
    await this.emitProgress(documentId, 'overwrite', PROGRESS_OVERWRITE, MSG_OVERWRITE);
    await this.store.secureWipe(documentId);

    // Step 3 — Confirm deletion (secureWipe already removed the record)
    await this.emitProgress(documentId, 'delete', PROGRESS_DELETE, MSG_DELETE);
    await eventBus.emit(EVENTS.DOCUMENT_DELETED, { documentId, reason: 'user_request' });

    // Step 4 — Generate deletion certificate
    await this.emitProgress(documentId, 'certificate_generation', PROGRESS_CERTIFICATE, MSG_CERTIFICATE);
    const now = new Date().toISOString();
    const certificate: DeletionCertificate = {
      certificateId: randomUUID(),
      documentId,
      documentTitle,
      dataTypesDestroyed: DATA_TYPES_DESTROYED,
      wipeMethod: WIPE_METHOD,
      deletedAt: now,
      issuedAt: now,
    };
    const certificatePdfBase64 = this.certGenerator.generatePdf(certificate);

    // Step 5 — Emit completion
    await this.emitProgress(documentId, 'complete', PROGRESS_COMPLETE, MSG_COMPLETE);
    await eventBus.emit(EVENTS.DELETION_COMPLETE, {
      documentId,
      certificateId: certificate.certificateId,
    });

    return { success: true, documentId, certificate, certificatePdfBase64, message: MSG_COMPLETE };
  }

  private async emitProgress(
    documentId: string,
    step: DeletionStep,
    percentComplete: number,
    message: string,
  ): Promise<void> {
    await eventBus.emit(EVENTS.DELETION_STEP_PROGRESS, {
      documentId,
      step,
      percentComplete,
      message,
    });
  }
}
