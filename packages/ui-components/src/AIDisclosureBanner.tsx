// AIDisclosureBanner.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Required AI disclosure banner — present on every AI-powered screen.
//          Field Blue background, military-olive left border. Collapsible to 2px bar per session.

import React, { useCallback, useState } from 'react';

interface AIDisclosureBannerProps {
  // Allow callers to override the default text for context-specific screens
  readonly customMessage?: string;
}

const DISCLOSURE_TEXT =
  'VetAssist uses AI to provide educational information. This is not legal or medical advice. ' +
  'For claim-specific help, contact a VA-accredited VSO.';

const expandedStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-field-blue)',
  borderLeft: '3px solid var(--va-color-military-olive)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '12px 18px',
  transition: `all var(--va-duration-normal)`,
};

const collapsedStyle: React.CSSProperties = {
  height: '2px',
  backgroundColor: 'var(--va-color-military-olive)',
  opacity: 0.4,
  transition: `all var(--va-duration-normal)`,
};

const iconStyle: React.CSSProperties = {
  color: 'var(--va-color-text-secondary)',
  fontSize: '16px',
  flexShrink: 0,
  paddingTop: '2px',
};

const textStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  fontStyle: 'italic',
  color: 'var(--va-color-text-secondary)',
  lineHeight: 1.5,
  flex: 1,
};

const dismissBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-caption)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-text-secondary)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  flexShrink: 0,
  padding: '0',
  minHeight: '48px',
  minWidth: '48px',
  display: 'flex',
  alignItems: 'center',
};

export const AIDisclosureBanner = React.forwardRef<HTMLDivElement, AIDisclosureBannerProps>(
  ({ customMessage }, ref) => {
    const [dismissed, setDismissed] = useState(false);

    const handleDismiss = useCallback(() => setDismissed(true), []);

    const message = customMessage ?? DISCLOSURE_TEXT;

    if (dismissed) {
      // Collapsed — remains as a 2px border line for session duration
      return (
        <div
          ref={ref}
          style={collapsedStyle}
          role="note"
          aria-label="AI disclosure banner minimized"
        />
      );
    }

    return (
      <div
        ref={ref}
        style={expandedStyle}
        role="note"
        aria-label="AI disclosure"
      >
        <span style={iconStyle} aria-hidden="true">⚙</span>
        <p style={textStyle}>{message}</p>
        <button
          style={dismissBtnStyle}
          onClick={handleDismiss}
          aria-label="Dismiss AI disclosure banner for this session"
        >
          Got it
        </button>
      </div>
    );
  }
);

AIDisclosureBanner.displayName = 'AIDisclosureBanner';
