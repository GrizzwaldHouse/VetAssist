// page.tsx
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Public impact page — live anonymous usage metrics, no auth required

import React from 'react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api';

interface ImpactData {
  readonly aggregates: {
    readonly veteransServed: number;
    readonly documentsReviewed: number;
    readonly benefitsDiscovered: number;
    readonly accessibilitySessions: number;
    readonly crisisDetections: number;
  };
  readonly periodStart: string;
  readonly periodEnd:   string;
}

// ISR — revalidates every hour so the page feels live without being SSR
export const revalidate = 3600;

async function fetchImpact(): Promise<ImpactData | null> {
  try {
    const res = await fetch(`${API_BASE}/analytics/impact`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return res.json() as Promise<ImpactData>;
  } catch {
    return null;
  }
}

const pageStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '48px 24px',
  fontFamily: 'var(--va-font-sans, system-ui, sans-serif)',
  textAlign: 'center',
};

const titleStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 800,
  marginBottom: 12,
  color: 'var(--va-color-text-primary, #1a202c)',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 16,
  color: 'var(--va-color-text-secondary, #718096)',
  marginBottom: 48,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  gap: 24,
  marginBottom: 48,
};

const statCardStyle: React.CSSProperties = {
  padding: '28px 20px',
  borderRadius: 12,
  border: '1px solid var(--va-color-border, #e2e8f0)',
  background: 'var(--va-color-surface, #fff)',
};

const statValueStyle: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 800,
  color: 'var(--va-color-primary, #2b6cb0)',
  lineHeight: 1,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--va-color-text-secondary, #718096)',
  marginTop: 8,
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--va-color-text-muted, #a0aec0)',
  marginTop: 32,
};

export default async function ImpactPage() {
  const data = await fetchImpact();
  const a    = data?.aggregates;

  const stats: readonly { value: string; label: string }[] = [
    { value: a ? a.veteransServed.toLocaleString()    : '—', label: 'Veterans Served This Month' },
    { value: a ? a.documentsReviewed.toLocaleString() : '—', label: 'Documents Reviewed' },
    { value: a ? a.benefitsDiscovered.toLocaleString(): '—', label: 'Benefits Discovered' },
    { value: a ? a.crisisDetections.toLocaleString()  : '—', label: 'Crisis Resources Connected' },
    {
      value: a && a.veteransServed > 0
        ? `${Math.round((a.accessibilitySessions / a.veteransServed) * 100)}%`
        : '—',
      label: 'Sessions Using Accessibility Features',
    },
  ] as const;

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>VetAssist Impact</h1>
      <p style={subtitleStyle}>
        Anonymous usage metrics — updated hourly. No personal data ever collected.
      </p>

      <div style={gridStyle}>
        {stats.map((s) => (
          <div key={s.label} style={statCardStyle}>
            <div style={statValueStyle}>{s.value}</div>
            <div style={statLabelStyle}>{s.label}</div>
          </div>
        ))}
      </div>

      <p style={disclaimerStyle}>
        All statistics are anonymous aggregate counts. VetAssist collects no personally identifiable information.
        Analytics are opt-in only and can be disabled in Settings.
      </p>
    </div>
  );
}
