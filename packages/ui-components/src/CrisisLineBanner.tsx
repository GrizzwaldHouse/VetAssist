// CrisisLineBanner.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Sticky, non-dismissable Veterans Crisis Line banner — highest z-index on every screen.
//          Non-negotiable safety requirement: always visible, always pressable, slow opacity pulse.

import React from 'react';

// Crisis line contact constants — never hardcoded inline
const CRISIS_PHONE = '988';
const CRISIS_TEXT  = '838255';
const CRISIS_CHAT  = 'VeteransCrisisLine.net';
const CRISIS_ARIA  = `Veterans Crisis Line. Call ${CRISIS_PHONE} and press 1. Text ${CRISIS_TEXT}. Chat at ${CRISIS_CHAT}.`;

const styles: Record<string, React.CSSProperties> = {
  banner: {
    position: 'sticky',
    top: 0,
    zIndex: 'var(--va-z-crisis)' as unknown as number,
    height: '48px',
    backgroundColor: 'var(--va-color-crisis-bg)',
    borderLeft: '4px solid var(--va-color-old-glory-red)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    textDecoration: 'none',
    // Pulse animation wired via className — CSS handles @media prefers-reduced-motion
  },
  text: {
    fontFamily: 'var(--va-font-heading)',
    fontSize: 'var(--va-text-label)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--va-color-crisis-text)',
  },
  star: {
    color: 'var(--va-color-crisis-text)',
    fontSize: '14px',
    opacity: 0.9,
    userSelect: 'none',
  },
};

// Pulse keyframes injected once into the document head
const PULSE_CSS = `
@keyframes va-crisis-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.88; }
}
@media (prefers-reduced-motion: no-preference) {
  .va-crisis-banner { animation: va-crisis-pulse 3s ease-in-out infinite; }
}
`;

let pulseInjected = false;

function injectPulseStyles(): void {
  if (pulseInjected || typeof document === 'undefined') return;
  const tag = document.createElement('style');
  tag.textContent = PULSE_CSS;
  document.head.appendChild(tag);
  pulseInjected = true;
}

export const CrisisLineBanner: React.FC = () => {
  injectPulseStyles();

  return (
    <a
      href={`tel:${CRISIS_PHONE}`}
      className="va-crisis-banner"
      style={styles.banner}
      aria-label={CRISIS_ARIA}
      // Non-dismissable — no close handler, no visibility toggle
    >
      <span style={styles.star} aria-hidden="true">★</span>
      <span style={styles.text}>
        VETERANS CRISIS LINE: CALL {CRISIS_PHONE} PRESS 1&nbsp;&nbsp;|&nbsp;&nbsp;
        TEXT {CRISIS_TEXT}&nbsp;&nbsp;|&nbsp;&nbsp;
        CHAT {CRISIS_CHAT}
      </span>
      <span style={styles.star} aria-hidden="true">★</span>
    </a>
  );
};

CrisisLineBanner.displayName = 'CrisisLineBanner';
