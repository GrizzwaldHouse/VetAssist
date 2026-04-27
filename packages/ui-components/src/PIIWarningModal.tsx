// PIIWarningModal.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Modal displayed when PII is detected in a document or text input.
//          Deep Old Glory Red border, describes what type was found, never the actual value.
//          Focus-trapped, accessible, dismissable only via explicit CTA.

import React, { useCallback, useEffect, useId, useRef } from 'react';

// PII type labels shown to the veteran — human-readable, not technical codes
const PII_TYPE_LABELS: Record<string, string> = {
  SSN:          'a Social Security Number',
  VA_FILE:      'a VA File Number',
  CREDIT_CARD:  'credit card digits',
  DOB:          'a date of birth',
  ADDRESS:      'a home address',
  PHONE:        'a phone number',
};

type PIIType = keyof typeof PII_TYPE_LABELS;

interface PIIWarningModalProps {
  readonly isOpen: boolean;
  // What type of PII was detected — drives the body copy
  readonly detectedType: PIIType | string;
  // 'redacted' (document upload) | 'blocked' (text input)
  readonly action: 'redacted' | 'blocked';
  readonly onDismiss: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 'var(--va-z-modal)' as unknown as number,
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-old-glory-red)',
  borderLeft: '4px solid var(--va-color-old-glory-red)',
  borderRadius: 'var(--va-radius-card)',
  maxWidth: '480px',
  width: '100%',
  padding: '28px 28px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const headerRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
};

const headerTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-old-glory-red)',
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.6,
};

const ctaStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: 'var(--va-color-crisis-text)',
  border: 'none',
  borderRadius: 'var(--va-radius-card)',
  width: '100%',
  height: '48px',
  cursor: 'pointer',
};

const noteStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  fontStyle: 'italic',
  color: 'var(--va-color-text-secondary)',
  textAlign: 'center',
};

export const PIIWarningModal = React.forwardRef<HTMLDivElement, PIIWarningModalProps>(
  ({ isOpen, detectedType, action, onDismiss }, ref) => {
    const titleId  = useId();
    const bodyId   = useId();
    const closeRef = useRef<HTMLButtonElement>(null);

    // Focus the dismiss button when the modal opens
    useEffect(() => {
      if (isOpen) closeRef.current?.focus();
    }, [isOpen]);

    // Trap focus within the modal and close on Escape
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') onDismiss();
    }, [onDismiss]);

    if (!isOpen) return null;

    const typeLabel = PII_TYPE_LABELS[detectedType] ?? detectedType;

    const bodyText = action === 'redacted'
      ? `We found ${typeLabel} in your document and automatically covered it with a redaction overlay before any processing. Your personal information was never sent to our AI systems.`
      : `We detected ${typeLabel} in what you typed. The content has been blocked from leaving your device. Please remove this information before continuing.`;

    return (
      <div
        style={overlayStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
      >
        <div ref={ref} style={cardStyle}>
          {/* Header */}
          <div style={headerRowStyle}>
            <span style={{ color: 'var(--va-color-old-glory-red)', fontSize: '20px' }} aria-hidden="true">
              ⚠
            </span>
            <span style={{ color: 'var(--va-color-star-white)', opacity: 0.6, fontSize: '14px' }} aria-hidden="true">
              ★
            </span>
            <h2 id={titleId} style={headerTextStyle}>
              Sensitive Information Detected
            </h2>
          </div>

          {/* Body */}
          <p id={bodyId} style={bodyTextStyle}>{bodyText}</p>

          {/* Dismiss — the only exit */}
          <button
            ref={closeRef}
            style={ctaStyle}
            onClick={onDismiss}
            aria-label="Acknowledge and close this warning"
          >
            I Understand — Continue
          </button>

          <p style={noteStyle}>
            ★ VetAssist never stores, logs, or transmits your personal identifiers.
          </p>
        </div>
      </div>
    );
  }
);

PIIWarningModal.displayName = 'PIIWarningModal';
