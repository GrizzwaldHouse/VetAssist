// page.tsx
// Developer: Marcus Daley
// Date: 2026-05-01
// Purpose: Admin analytics dashboard — usage aggregates, grant report generator, funnel view

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../../../lib/apiClient.js';
import type { UsageAggregates } from '../../../lib/apiClient.js';

// Default date range helpers
function isoMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] ?? '';
}

function isoToday(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

const pageStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '32px 24px',
  fontFamily: 'var(--va-font-sans, system-ui, sans-serif)',
};

const headingStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 8,
  color: 'var(--va-color-text-primary, #1a202c)',
};

const subheadStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--va-color-text-secondary, #718096)',
  marginBottom: 32,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 16,
  marginBottom: 32,
};

const cardStyle: React.CSSProperties = {
  padding: '20px 16px',
  borderRadius: 8,
  border: '1px solid var(--va-color-border, #e2e8f0)',
  background: 'var(--va-color-surface, #fff)',
};

const metricValueStyle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 700,
  color: 'var(--va-color-primary, #2b6cb0)',
};

const metricLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--va-color-text-secondary, #718096)',
  marginTop: 4,
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  alignItems: 'flex-end',
  marginBottom: 24,
  flexWrap: 'wrap',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--va-color-border, #e2e8f0)',
  borderRadius: 6,
  fontSize: 14,
};

const btnStyle: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 6,
  background: 'var(--va-color-primary, #2b6cb0)',
  color: '#fff',
  border: 'none',
  fontSize: 14,
  cursor: 'pointer',
};

const EMPTY_AGGREGATES: UsageAggregates = {
  veteransServed: 0,
  documentsReviewed: 0,
  benefitsDiscovered: 0,
  decisionLettersAnalyzed: 0,
  crisisDetections: 0,
  accessibilitySessions: 0,
  communityStoriesSubmitted: 0,
};

export default function AdminAnalyticsPage() {
  const [from, setFrom]             = useState<string>(isoMonthStart());
  const [to, setTo]                 = useState<string>(isoToday());
  const [aggregates, setAggregates] = useState<UsageAggregates>(EMPTY_AGGREGATES);
  const [loading, setLoading]       = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);
  const [reporting, setReporting]   = useState<boolean>(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminDashboard(from, to);
      setAggregates(data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleGenerateReport = async () => {
    setReporting(true);
    try {
      const report = await apiClient.generateGrantReport(from, to);
      // Decode base64 PDF and trigger browser download
      const bytes  = Uint8Array.from(atob(report.pdfBase64), (c) => c.charCodeAt(0));
      const blob   = new Blob([bytes], { type: 'application/pdf' });
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href  = url;
      anchor.download = `vetassist-grant-report-${from}-${to}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to generate grant report.');
    } finally {
      setReporting(false);
    }
  };

  const metrics: readonly { label: string; value: number }[] = [
    { label: 'Veterans Served',          value: aggregates.veteransServed },
    { label: 'Documents Reviewed',       value: aggregates.documentsReviewed },
    { label: 'Benefits Discovered',      value: aggregates.benefitsDiscovered },
    { label: 'Decision Letters',         value: aggregates.decisionLettersAnalyzed },
    { label: 'Crisis Detections',        value: aggregates.crisisDetections },
    { label: 'Accessibility Sessions',   value: aggregates.accessibilitySessions },
    { label: 'Community Stories',        value: aggregates.communityStoriesSubmitted },
  ] as const;

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>Analytics Dashboard</h1>
      <p style={subheadStyle}>Anonymous aggregate usage data. No PII. Admin access only.</p>

      <div style={controlRowStyle}>
        <label>
          <span style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={inputStyle}
            aria-label="Period start date"
          />
        </label>
        <label>
          <span style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={inputStyle}
            aria-label="Period end date"
          />
        </label>
        <button onClick={() => void fetchDashboard()} style={btnStyle} aria-label="Refresh dashboard">
          {loading ? 'Loading…' : 'Refresh'}
        </button>
        <button
          onClick={() => void handleGenerateReport()}
          style={{ ...btnStyle, background: 'var(--va-color-success, #276749)' }}
          disabled={reporting}
          aria-label="Generate grant report PDF"
        >
          {reporting ? 'Generating…' : 'Generate Grant Report'}
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: 'var(--va-color-error, #c53030)', marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={gridStyle}>
        {metrics.map((m) => (
          <div key={m.label} style={cardStyle}>
            <div style={metricValueStyle}>{m.value.toLocaleString()}</div>
            <div style={metricLabelStyle}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
