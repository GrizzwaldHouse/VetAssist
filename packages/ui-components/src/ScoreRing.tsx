// ScoreRing.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Animated document quality score ring — precision instrument aesthetic, not a donut chart.
//          140px diameter, 24 tick marks, score gradient red→gold→green, 800ms ease-out fill animation.

import React, { useEffect, useRef, useState } from 'react';

interface ScoreRingProps {
  // 0–100 integer score
  readonly score: number;
  // Category label shown below the percentage
  readonly label: string;
  // Diameter in px — defaults to design-spec 140
  readonly size?: number;
}

// Map a 0-100 score to the correct gradient color via design token values
function resolveScoreColor(score: number): string {
  if (score < 40) return 'var(--va-color-score-low)';
  if (score < 70) return 'var(--va-color-score-mid)';
  return 'var(--va-color-score-high)';
}

// Build the SVG tick marks — 24 equally spaced 1px lines at 20% opacity
function buildTickMarks(cx: number, cy: number, outerR: number, count: number): React.ReactNode[] {
  const tickInner = outerR - 6;
  const tickOuter = outerR + 2;
  const ticks: React.ReactNode[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360 - 90; // start at top
    const rad   = (angle * Math.PI) / 180;
    const x1 = cx + tickInner * Math.cos(rad);
    const y1 = cy + tickInner * Math.sin(rad);
    const x2 = cx + tickOuter * Math.cos(rad);
    const y2 = cy + tickOuter * Math.sin(rad);

    ticks.push(
      <line
        key={i}
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke="var(--va-color-text-secondary)"
        strokeWidth="1"
        opacity="0.2"
        aria-hidden="true"
      />
    );
  }
  return ticks;
}

export const ScoreRing = React.forwardRef<SVGSVGElement, ScoreRingProps>(
  ({ score, label, size = 140 }, ref) => {
    const clampedScore = Math.max(0, Math.min(100, score));
    const strokeWidth  = 12;
    const padding      = 16; // room for tick marks outside ring
    const viewSize     = size + padding * 2;
    const cx           = viewSize / 2;
    const cy           = viewSize / 2;
    const radius       = size / 2 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const targetOffset  = circumference - (clampedScore / 100) * circumference;

    // Animate from full offset (empty) to target offset on mount
    const [dashOffset, setDashOffset] = useState(circumference);
    const animatingRef = useRef(false);

    useEffect(() => {
      if (animatingRef.current) return;
      animatingRef.current = true;

      // Defer so the initial render shows the empty state before animating
      const frame = requestAnimationFrame(() => {
        setDashOffset(targetOffset);
      });
      return () => cancelAnimationFrame(frame);
    }, [targetOffset]);

    const color = resolveScoreColor(clampedScore);

    // CSS transition respects --va-duration-slow which is 0ms when prefers-reduced-motion is set
    const ringTransition = `stroke-dashoffset var(--va-duration-slow) var(--va-ease-out)`;

    return (
      <svg
        ref={ref}
        width={viewSize}
        height={viewSize}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        role="img"
        aria-label={`Document quality score: ${clampedScore}% — ${label}`}
        style={{ display: 'block' }}
      >
        {/* Track ring */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke="var(--va-color-border)"
          strokeWidth={strokeWidth}
          aria-hidden="true"
        />

        {/* Score ring — animated */}
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // SVG arcs start at 3 o'clock — rotate to 12 o'clock
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: ringTransition }}
          aria-hidden="true"
        />

        {/* Tick marks — precision instrument gauge */}
        {buildTickMarks(cx, cy, radius + strokeWidth / 2, 24)}

        {/* Score percentage — Oswald 700, military readout feel */}
        <text
          x={cx} y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--va-color-star-white)"
          fontSize="2rem"
          fontFamily="var(--va-font-heading)"
          fontWeight="700"
          aria-hidden="true"
        >
          {clampedScore}%
        </text>

        {/* Category label — Source Serif 4 12px */}
        <text
          x={cx} y={cy + 22}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--va-color-text-secondary)"
          fontSize="0.67rem"
          fontFamily="var(--va-font-body)"
          aria-hidden="true"
        >
          {label}
        </text>
      </svg>
    );
  }
);

ScoreRing.displayName = 'ScoreRing';
