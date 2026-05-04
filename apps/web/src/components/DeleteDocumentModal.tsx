// DeleteDocumentModal.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Three-step deletion flow — confirm → animated progress → certificate download

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { DataDestructionResult, DeletionProgress } from '@vetassist/shared-types';

// ─── Display constants — zero hardcoded strings in JSX ────────────────────────

const MODAL_TITLE            = 'Delete Document';
const STEP_CONFIRM_HEADING   = 'Permanently delete this document?';
const CONFIRM_WARNING        = 'This action cannot be undone. Your document will be securely wiped — all data overwritten with zeros before deletion. A deletion certificate will be generated for your records.';
const CONFIRM_DOWNLOAD_NOTE  = 'You may download a copy before deleting.';
const BTN_DOWNLOAD_FIRST     = 'Download first';
const BTN_DELETE             = 'Delete permanently';
const BTN_CANCEL             = 'Cancel';
const BTN_CLOSE              = 'Close';
const BTN_DOWNLOAD_CERT      = 'Download certificate';
const STEP_PROGRESS_HEADING  = 'Deleting document…';
const STEP_DONE_HEADING      = 'Document deleted';
const DONE_MESSAGE           = 'Your document has been permanently and securely destroyed.';
const CERT_READY_NOTE        = 'Your deletion certificate is ready. Keep it for your records.';
const ERROR_PREFIX           = 'Deletion failed: ';
const API_DESTROY_PATH       = '/api/documents';

// Progress bar color — distinct from the primary navy to signal a destructive action
const PROGRESS_BAR_COLOR     = '#c00';
const PROGRESS_BG_COLOR      = '#f0f0f0';

interface DeleteDocumentModalProps {
  readonly documentId: string;
  readonly documentTitle: string;
  readonly documentContent?: string;
  readonly onClose: () => void;
  readonly onDeleted?: () => void;
}

type Step = 'confirm' | 'progress' | 'done';

export function DeleteDocumentModal({
  documentId,
  documentTitle,
  documentContent,
  onClose,
  onDeleted,
}: DeleteDocumentModalProps) {
  const [step, setStep]               = useState<Step>('confirm');
  const [progress, setProgress]       = useState<DeletionProgress | null>(null);
  const [percentComplete, setPercent] = useState(0);
  const [result, setResult]           = useState<DataDestructionResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const eventSourceRef                = useRef<EventSource | null>(null);

  // Clean up SSE connection if the modal is closed mid-deletion
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const handleDownloadFirst = useCallback(() => {
    if (!documentContent) return;
    const blob   = new Blob([documentContent], { type: 'text/plain' });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = `${documentTitle.replace(/\s+/g, '_')}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, [documentContent, documentTitle]);

  const handleDelete = useCallback(() => {
    setStep('progress');
    setError(null);

    // Open SSE stream — DELETE with body requires fetch; EventSource is GET-only
    // We use fetch with a ReadableStream reader to consume the SSE frames
    void (async () => {
      try {
        const response = await fetch(`${API_DESTROY_PATH}/${documentId}/destroy`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentTitle }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`Server returned ${response.status}`);
        }

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse complete SSE frames — each ends with \n\n
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';

          for (const frame of frames) {
            const eventLine = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim();
            const dataLine  = frame.match(/^data:\s*(.+)$/m)?.[1]?.trim();

            if (!eventLine || !dataLine) continue;

            if (eventLine === 'progress') {
              const prog = JSON.parse(dataLine) as DeletionProgress;
              setProgress(prog);
              setPercent(prog.percentComplete);
            } else if (eventLine === 'done') {
              const res = JSON.parse(dataLine) as DataDestructionResult;
              setResult(res);
              setPercent(100);
              setStep('done');
              onDeleted?.();
            } else if (eventLine === 'error') {
              const err = JSON.parse(dataLine) as { error: string };
              throw new Error(err.error);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unexpected error.';
        setError(`${ERROR_PREFIX}${msg}`);
        setStep('confirm');
      }
    })();
  }, [documentId, documentTitle, onDeleted]);

  const handleDownloadCertificate = useCallback(() => {
    if (!result?.certificatePdfBase64) return;
    const bytes  = Uint8Array.from(atob(result.certificatePdfBase64), (ch) => ch.charCodeAt(0));
    const blob   = new Blob([bytes], { type: 'application/pdf' });
    const url    = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href     = url;
    anchor.download = `deletion-certificate-${result.certificate?.certificateId ?? documentId}.pdf`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, [result, documentId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      style={OVERLAY_STYLE}
    >
      <div style={DIALOG_STYLE}>
        <h2 id="delete-modal-title" style={TITLE_STYLE}>{MODAL_TITLE}</h2>

        {step === 'confirm' && (
          <ConfirmStep
            documentTitle={documentTitle}
            hasContent={!!documentContent}
            error={error}
            onDownloadFirst={handleDownloadFirst}
            onDelete={handleDelete}
            onCancel={onClose}
          />
        )}

        {step === 'progress' && (
          <ProgressStep
            progress={progress}
            percentComplete={percentComplete}
          />
        )}

        {step === 'done' && result && (
          <DoneStep
            result={result}
            onDownloadCertificate={handleDownloadCertificate}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ConfirmStepProps {
  readonly documentTitle: string;
  readonly hasContent: boolean;
  readonly error: string | null;
  readonly onDownloadFirst: () => void;
  readonly onDelete: () => void;
  readonly onCancel: () => void;
}

function ConfirmStep({ documentTitle, hasContent, error, onDownloadFirst, onDelete, onCancel }: ConfirmStepProps) {
  return (
    <div>
      <p style={SUBHEADING_STYLE}>{STEP_CONFIRM_HEADING}</p>
      <p style={DOCUMENT_TITLE_STYLE}>"{documentTitle}"</p>
      <p style={WARNING_STYLE}>{CONFIRM_WARNING}</p>
      {hasContent && <p style={DOWNLOAD_NOTE_STYLE}>{CONFIRM_DOWNLOAD_NOTE}</p>}
      {error && <p style={ERROR_STYLE} role="alert">{error}</p>}
      <div style={BTN_ROW_STYLE}>
        <button onClick={onCancel} style={BTN_SECONDARY_STYLE}>{BTN_CANCEL}</button>
        {hasContent && (
          <button onClick={onDownloadFirst} style={BTN_SECONDARY_STYLE}>{BTN_DOWNLOAD_FIRST}</button>
        )}
        <button onClick={onDelete} style={BTN_DANGER_STYLE}>{BTN_DELETE}</button>
      </div>
    </div>
  );
}

interface ProgressStepProps {
  readonly progress: DeletionProgress | null;
  readonly percentComplete: number;
}

function ProgressStep({ progress, percentComplete }: ProgressStepProps) {
  return (
    <div>
      <p style={SUBHEADING_STYLE}>{STEP_PROGRESS_HEADING}</p>
      <div style={PROGRESS_BG_STYLE} role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ ...PROGRESS_BAR_STYLE, width: `${percentComplete}%` }} />
      </div>
      <p style={PROGRESS_LABEL_STYLE}>{percentComplete}%</p>
      {progress && <p style={PROGRESS_MSG_STYLE}>{progress.message}</p>}
    </div>
  );
}

interface DoneStepProps {
  readonly result: DataDestructionResult;
  readonly onDownloadCertificate: () => void;
  readonly onClose: () => void;
}

function DoneStep({ result, onDownloadCertificate, onClose }: DoneStepProps) {
  return (
    <div>
      <p style={SUCCESS_STYLE}>{STEP_DONE_HEADING}</p>
      <p style={CONFIRM_TEXT_STYLE}>{DONE_MESSAGE}</p>
      {result.certificatePdfBase64 && (
        <>
          <p style={CERT_NOTE_STYLE}>{CERT_READY_NOTE}</p>
          <div style={BTN_ROW_STYLE}>
            <button onClick={onDownloadCertificate} style={BTN_PRIMARY_STYLE}>{BTN_DOWNLOAD_CERT}</button>
            <button onClick={onClose} style={BTN_SECONDARY_STYLE}>{BTN_CLOSE}</button>
          </div>
        </>
      )}
      {!result.certificatePdfBase64 && (
        <div style={BTN_ROW_STYLE}>
          <button onClick={onClose} style={BTN_PRIMARY_STYLE}>{BTN_CLOSE}</button>
        </div>
      )}
    </div>
  );
}

// ─── Inline styles ────────────────────────────────────────────────────────────

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const DIALOG_STYLE: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '100%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
};
const TITLE_STYLE: React.CSSProperties        = { margin: '0 0 16px', fontSize: 20, fontWeight: 700 };
const SUBHEADING_STYLE: React.CSSProperties   = { margin: '0 0 8px', fontWeight: 600, fontSize: 15 };
const DOCUMENT_TITLE_STYLE: React.CSSProperties = { fontStyle: 'italic', marginBottom: 12, color: '#333' };
const WARNING_STYLE: React.CSSProperties      = { fontSize: 13, color: '#555', marginBottom: 10, lineHeight: 1.5 };
const DOWNLOAD_NOTE_STYLE: React.CSSProperties = { fontSize: 12, color: '#666', marginBottom: 14 };
const CONFIRM_TEXT_STYLE: React.CSSProperties  = { fontSize: 14, color: '#333', marginBottom: 12 };
const CERT_NOTE_STYLE: React.CSSProperties    = { fontSize: 13, color: '#555', marginBottom: 14 };
const PROGRESS_BG_STYLE: React.CSSProperties  = {
  background: PROGRESS_BG_COLOR, borderRadius: 6, height: 12, overflow: 'hidden', marginBottom: 8,
};
const PROGRESS_BAR_STYLE: React.CSSProperties = {
  background: PROGRESS_BAR_COLOR, height: '100%', borderRadius: 6,
  transition: 'width 0.3s ease-in-out',
};
const PROGRESS_LABEL_STYLE: React.CSSProperties = { fontSize: 12, color: '#666', marginBottom: 6, textAlign: 'right' };
const PROGRESS_MSG_STYLE: React.CSSProperties   = { fontSize: 13, color: '#444', marginTop: 8 };
const BTN_ROW_STYLE: React.CSSProperties   = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 };
const BTN_PRIMARY_STYLE: React.CSSProperties  = { padding: '9px 18px', background: '#003366', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const BTN_SECONDARY_STYLE: React.CSSProperties = { padding: '9px 18px', background: '#eee', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer' };
const BTN_DANGER_STYLE: React.CSSProperties  = { padding: '9px 18px', background: '#c00', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const ERROR_STYLE: React.CSSProperties      = { color: '#c00', fontSize: 13, marginBottom: 10 };
const SUCCESS_STYLE: React.CSSProperties    = { color: '#1a6b1a', fontWeight: 700, marginBottom: 8, fontSize: 16 };
