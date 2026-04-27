// ShareDocumentModal.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Two-step share dialog — channel select → explicit confirm → PII-clean delivery

'use client';

import React, { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient.js';
import type { ShareChannel, ShareResult } from '../lib/apiClient.js';

// Display text constants — zero hardcoded strings in JSX
const MODAL_TITLE           = 'Share Document';
const STEP_CHANNEL_HEADING  = 'How would you like to share this document?';
const STEP_CONFIRM_HEADING  = 'Confirm sharing';
const LABEL_EMAIL           = 'Email';
const LABEL_SMS             = 'SMS / Text Message';
const LABEL_DOWNLOAD        = 'Download as .txt';
const LABEL_RECIPIENT_EMAIL = 'Email address';
const LABEL_RECIPIENT_SMS   = 'Phone number (digits only)';
const PLACEHOLDER_EMAIL     = 'veteran@example.com';
const PLACEHOLDER_SMS       = '5555550100';
const BTN_NEXT              = 'Next →';
const BTN_CONFIRM           = 'Yes, Share Document';
const BTN_BACK              = '← Back';
const BTN_CANCEL            = 'Cancel';
const BTN_CLOSE             = 'Close';
const BTN_SHARING           = 'Sharing…';
const PII_NOTICE            = 'Your document will be scanned for sensitive information before sharing. Any detected PII will be redacted automatically.';
const PII_REDACTED_NOTICE   = 'Sensitive information was detected and redacted from your document before sharing.';
const SUCCESS_DOWNLOAD_NOTE = 'Your document has been prepared. Click below to save it.';
const SUCCESS_EMAIL_NOTE    = 'Your email client will open with the document ready to send.';
const SUCCESS_SMS_NOTE      = 'Your SMS app will open with the document ready to send.';
const ERROR_PREFIX          = 'Share failed: ';

interface ShareDocumentModalProps {
  readonly documentContent: string;
  readonly documentTitle: string;
  readonly sessionId?: string;
  readonly onClose: () => void;
}

type Step = 'channel' | 'confirm' | 'result';

export function ShareDocumentModal({
  documentContent,
  documentTitle,
  sessionId,
  onClose,
}: ShareDocumentModalProps) {
  const [step, setStep]           = useState<Step>('channel');
  const [channel, setChannel]     = useState<ShareChannel>('download');
  const [recipient, setRecipient] = useState<string>('');
  const [sharing, setSharing]     = useState(false);
  const [result, setResult]       = useState<ShareResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const handleNext = useCallback(() => {
    setError(null);
    setStep('confirm');
  }, []);

  const handleBack = useCallback(() => {
    setError(null);
    setStep('channel');
  }, []);

  const handleShare = useCallback(async () => {
    setSharing(true);
    setError(null);
    try {
      const res = await apiClient.shareDocument(
        documentContent,
        documentTitle,
        channel,
        channel !== 'download' ? recipient.trim() : null,
        sessionId,
      );

      if (!res.success) {
        setError(`${ERROR_PREFIX}${res.message}`);
        setSharing(false);
        return;
      }

      setResult(res);

      // Trigger browser actions for email/sms/download after server confirms PII-clean
      if (channel === 'download' && res.downloadPayload) {
        triggerDownload(res.downloadPayload, documentTitle);
      } else if (channel === 'email') {
        const body = encodeURIComponent(atob(res.downloadPayload ?? '') || documentContent);
        window.open(`mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(documentTitle)}&body=${body}`, '_blank');
      } else if (channel === 'sms') {
        const body = encodeURIComponent(atob(res.downloadPayload ?? '') || documentContent);
        window.open(`sms:${encodeURIComponent(recipient.trim())}?body=${body}`, '_blank');
      }

      setStep('result');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected error during share.';
      setError(`${ERROR_PREFIX}${msg}`);
    } finally {
      setSharing(false);
    }
  }, [channel, documentContent, documentTitle, recipient, sessionId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      style={OVERLAY_STYLE}
    >
      <div style={DIALOG_STYLE}>
        <h2 id="share-modal-title" style={TITLE_STYLE}>{MODAL_TITLE}</h2>

        {step === 'channel' && (
          <ChannelStep
            channel={channel}
            recipient={recipient}
            onChannelChange={setChannel}
            onRecipientChange={setRecipient}
            onNext={handleNext}
            onCancel={onClose}
          />
        )}

        {step === 'confirm' && (
          <ConfirmStep
            channel={channel}
            recipient={recipient}
            sharing={sharing}
            error={error}
            onConfirm={handleShare}
            onBack={handleBack}
          />
        )}

        {step === 'result' && result && (
          <ResultStep
            result={result}
            channel={channel}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ChannelStepProps {
  readonly channel: ShareChannel;
  readonly recipient: string;
  readonly onChannelChange: (c: ShareChannel) => void;
  readonly onRecipientChange: (v: string) => void;
  readonly onNext: () => void;
  readonly onCancel: () => void;
}

function ChannelStep({ channel, recipient, onChannelChange, onRecipientChange, onNext, onCancel }: ChannelStepProps) {
  const needsRecipient = channel === 'email' || channel === 'sms';
  const nextDisabled = needsRecipient && recipient.trim().length === 0;

  return (
    <div>
      <p style={SUBHEADING_STYLE}>{STEP_CHANNEL_HEADING}</p>

      <div style={RADIO_GROUP_STYLE} role="radiogroup" aria-label="Share channel">
        {(['email', 'sms', 'download'] as const).map((c) => (
          <label key={c} style={RADIO_LABEL_STYLE}>
            <input
              type="radio"
              name="share-channel"
              value={c}
              checked={channel === c}
              onChange={() => onChannelChange(c)}
              aria-label={channelLabel(c)}
            />
            {' '}{channelLabel(c)}
          </label>
        ))}
      </div>

      {needsRecipient && (
        <div style={INPUT_GROUP_STYLE}>
          <label htmlFor="share-recipient" style={INPUT_LABEL_STYLE}>
            {channel === 'email' ? LABEL_RECIPIENT_EMAIL : LABEL_RECIPIENT_SMS}
          </label>
          <input
            id="share-recipient"
            type={channel === 'email' ? 'email' : 'tel'}
            value={recipient}
            onChange={(e) => onRecipientChange(e.target.value)}
            placeholder={channel === 'email' ? PLACEHOLDER_EMAIL : PLACEHOLDER_SMS}
            style={INPUT_STYLE}
            aria-required="true"
          />
        </div>
      )}

      <p style={PII_NOTICE_STYLE}>{PII_NOTICE}</p>

      <div style={BTN_ROW_STYLE}>
        <button onClick={onCancel} style={BTN_SECONDARY_STYLE} aria-label={BTN_CANCEL}>{BTN_CANCEL}</button>
        <button onClick={onNext} disabled={nextDisabled} style={nextDisabled ? BTN_DISABLED_STYLE : BTN_PRIMARY_STYLE} aria-label={BTN_NEXT}>{BTN_NEXT}</button>
      </div>
    </div>
  );
}

interface ConfirmStepProps {
  readonly channel: ShareChannel;
  readonly recipient: string;
  readonly sharing: boolean;
  readonly error: string | null;
  readonly onConfirm: () => void;
  readonly onBack: () => void;
}

function ConfirmStep({ channel, recipient, sharing, error, onConfirm, onBack }: ConfirmStepProps) {
  return (
    <div>
      <p style={SUBHEADING_STYLE}>{STEP_CONFIRM_HEADING}</p>
      <p style={CONFIRM_TEXT_STYLE}>
        Share via <strong>{channelLabel(channel)}</strong>
        {recipient ? ` to ${recipient}` : ''}.
        Your document will be scanned for PII before sending.
      </p>

      {error && <p style={ERROR_STYLE} role="alert">{error}</p>}

      <div style={BTN_ROW_STYLE}>
        <button onClick={onBack} disabled={sharing} style={BTN_SECONDARY_STYLE} aria-label={BTN_BACK}>{BTN_BACK}</button>
        <button onClick={onConfirm} disabled={sharing} style={sharing ? BTN_DISABLED_STYLE : BTN_PRIMARY_STYLE} aria-label={BTN_CONFIRM}>
          {sharing ? BTN_SHARING : BTN_CONFIRM}
        </button>
      </div>
    </div>
  );
}

interface ResultStepProps {
  readonly result: ShareResult;
  readonly channel: ShareChannel;
  readonly onClose: () => void;
}

function ResultStep({ result, channel, onClose }: ResultStepProps) {
  return (
    <div>
      <p style={SUCCESS_STYLE}>✓ {result.message}</p>
      {result.piiFound && <p style={PII_NOTICE_STYLE}>{PII_REDACTED_NOTICE}</p>}
      <p style={CONFIRM_TEXT_STYLE}>{channelSuccessNote(channel)}</p>
      <div style={BTN_ROW_STYLE}>
        <button onClick={onClose} style={BTN_PRIMARY_STYLE} aria-label={BTN_CLOSE}>{BTN_CLOSE}</button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function channelLabel(c: ShareChannel): string {
  if (c === 'email')    return LABEL_EMAIL;
  if (c === 'sms')      return LABEL_SMS;
  return LABEL_DOWNLOAD;
}

function channelSuccessNote(c: ShareChannel): string {
  if (c === 'download') return SUCCESS_DOWNLOAD_NOTE;
  if (c === 'email')    return SUCCESS_EMAIL_NOTE;
  return SUCCESS_SMS_NOTE;
}

// Decode base64 payload and trigger browser file-save dialog
function triggerDownload(base64: string, title: string): void {
  const bytes   = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  const blob    = new Blob([bytes], { type: 'text/plain' });
  const url     = URL.createObjectURL(blob);
  const anchor  = document.createElement('a');
  anchor.href     = url;
  anchor.download = `${title.replace(/\s+/g, '_')}.txt`;
  anchor.click();
  // Revoke after a short tick so the download has time to start
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

// ─── Inline styles (Tailwind not available in plain components) ───────────────

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const DIALOG_STYLE: React.CSSProperties = {
  background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, width: '100%',
  boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
};
const TITLE_STYLE: React.CSSProperties       = { margin: '0 0 16px', fontSize: 20, fontWeight: 700 };
const SUBHEADING_STYLE: React.CSSProperties  = { margin: '0 0 12px', fontWeight: 600 };
const RADIO_GROUP_STYLE: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 };
const RADIO_LABEL_STYLE: React.CSSProperties = { cursor: 'pointer', fontSize: 15 };
const INPUT_GROUP_STYLE: React.CSSProperties = { marginBottom: 16 };
const INPUT_LABEL_STYLE: React.CSSProperties = { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 600 };
const INPUT_STYLE: React.CSSProperties       = { width: '100%', padding: '8px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };
const PII_NOTICE_STYLE: React.CSSProperties  = { fontSize: 12, color: '#666', marginBottom: 16 };
const CONFIRM_TEXT_STYLE: React.CSSProperties = { fontSize: 14, marginBottom: 16, color: '#333' };
const BTN_ROW_STYLE: React.CSSProperties     = { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 };
const BTN_PRIMARY_STYLE: React.CSSProperties = { padding: '9px 18px', background: '#003366', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 };
const BTN_SECONDARY_STYLE: React.CSSProperties = { padding: '9px 18px', background: '#eee', color: '#333', border: 'none', borderRadius: 6, cursor: 'pointer' };
const BTN_DISABLED_STYLE: React.CSSProperties  = { ...BTN_PRIMARY_STYLE, opacity: 0.5, cursor: 'not-allowed' };
const ERROR_STYLE: React.CSSProperties       = { color: '#c00', fontSize: 13, marginBottom: 10 };
const SUCCESS_STYLE: React.CSSProperties     = { color: '#1a6b1a', fontWeight: 700, marginBottom: 8 };
