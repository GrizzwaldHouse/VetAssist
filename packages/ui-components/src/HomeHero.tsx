// HomeHero.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Homepage hero section — full-width, Z-pattern composition, flag texture atmosphere,
//          star field in union position, Old Glory Red BATTLE BUDDY accent in headline.

import React from 'react';

interface HomeHeroProps {
  readonly onPrimaryAction?: () => void;
}

// Outer hero — Field Black + flag stripe texture + star field via repeating gradients
const heroStyle: React.CSSProperties = {
  position: 'relative',
  minHeight: '480px',
  backgroundColor: 'var(--va-color-field-black)',
  backgroundImage: [
    // Horizontal stripe pattern — flag stripes at 5% opacity
    `repeating-linear-gradient(
      180deg,
      rgba(122, 26, 26, 0.05) 0px,
      rgba(122, 26, 26, 0.05) 18px,
      transparent 18px,
      transparent 36px
    )`,
  ].join(', '),
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  padding: '64px var(--va-space-10)',
};

// Star field SVG in upper-left union position
const StarField: React.FC = () => (
  <svg
    aria-hidden="true"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '320px',
      height: '200px',
      opacity: 0.04,
      pointerEvents: 'none',
    }}
    viewBox="0 0 320 200"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* 15 scattered stars in the union quadrant */}
    {[
      [20, 30], [55, 20], [90, 40], [130, 15], [170, 35],
      [210, 20], [255, 30], [290, 15], [40, 70], [80, 80],
      [120, 65], [160, 85], [200, 60], [240, 75], [280, 65],
    ].map(([x, y], i) => (
      <text key={i} x={x} y={y} fill="#F5F5F5" fontSize="14" fontFamily="serif">★</text>
    ))}
  </svg>
);

// Grain texture overlay via SVG feTurbulence — 3% opacity worn-canvas effect
const GrainOverlay: React.FC = () => (
  <svg
    aria-hidden="true"
    style={{
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      opacity: 0.03,
      pointerEvents: 'none',
    }}
  >
    <filter id="va-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#va-grain)" />
  </svg>
);

const contentStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  maxWidth: '560px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const headlineStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-h1)',
  fontWeight: 700,
  lineHeight: 1.1,
  color: 'var(--va-color-star-white)',
  margin: 0,
};

const accentStyle: React.CSSProperties = {
  color: 'var(--va-color-old-glory-red)',
};

const subheadStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  lineHeight: 1.6,
  margin: 0,
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
  padding: '14px 32px',
  cursor: 'pointer',
  minHeight: '48px',
  alignSelf: 'flex-start',
  transition: `background var(--va-duration-fast)`,
};

// Bottom stripe divider — 3px line alternating Old Glory Red / transparent
const StripeDivider: React.FC = () => (
  <div
    aria-hidden="true"
    style={{
      height: '3px',
      backgroundImage: `repeating-linear-gradient(
        90deg,
        var(--va-color-old-glory-red) 0px,
        var(--va-color-old-glory-red) 40px,
        transparent 40px,
        transparent 60px
      )`,
    }}
  />
);

export const HomeHero = React.forwardRef<HTMLElement, HomeHeroProps>(
  ({ onPrimaryAction }, ref) => (
    <section ref={ref} aria-label="Welcome to VetAssist">
      <div style={heroStyle}>
        {/* Atmosphere layers */}
        <StarField />
        <GrainOverlay />

        {/* Hero content — left side of Z-pattern */}
        <div style={contentStyle}>
          <h1 style={headlineStyle}>
            Your AI{' '}
            <span style={accentStyle}>Battle Buddy</span>
            {' '}for VA Benefits
          </h1>

          <p style={subheadStyle}>
            Understand your benefits. Write better documents. Navigate the system.
          </p>

          <button
            style={ctaStyle}
            onClick={onPrimaryAction}
            aria-label="Start with a chat — begin your VetAssist session"
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--va-color-crisis-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--va-color-old-glory-red)')}
          >
            Start With a Chat
          </button>
        </div>
      </div>

      {/* Stripe divider at bottom of hero */}
      <StripeDivider />
    </section>
  )
);

HomeHero.displayName = 'HomeHero';
