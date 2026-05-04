// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-27
// Purpose: VR&E Chapter 31 Guide — eligibility checker, 4-track explainer, Ch.31 vs Ch.33 comparison, application walkthrough

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AIDisclosureBanner, CrisisLineBanner } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type {
  VREGuideResponse,
  VRETrack,
  VRETrackId,
  VREEligibilityResult,
  VREDischargeType,
} from '../../lib/apiClient.js';

// ── Page constants ─────────────────────────────────────────────────────────────

const PAGE_HEADING    = 'VR&E Chapter 31 Guide';
const PAGE_SUBHEADING = 'Vocational Rehabilitation & Employment — education, career training, and independent living support for veterans with service-connected disabilities.';
const CFR_CITATION    = '38 CFR Part 21, Subpart C';

const TAB_LABELS: ReadonlyArray<{ readonly id: TabId; readonly label: string }> = [
  { id: 'eligibility',    label: 'Eligibility Checker' },
  { id: 'tracks',         label: '5 Service Tracks' },
  { id: 'comparison',     label: 'Ch. 31 vs Ch. 33' },
  { id: 'howto',          label: 'How to Apply' },
];

const DISCHARGE_OPTIONS: ReadonlyArray<{ readonly value: VREDischargeType; readonly label: string }> = [
  { value: 'honorable',           label: 'Honorable' },
  { value: 'general',             label: 'General (Under Honorable Conditions)' },
  { value: 'other_than_honorable', label: 'Other Than Honorable' },
  { value: 'dishonorable',        label: 'Dishonorable' },
  { value: 'unknown',             label: 'Unknown / Not Sure' },
];

const ELIGIBILITY_STATUS_CONFIG: Readonly<Record<VREEligibilityResult['status'], { label: string; color: string; bg: string }>> = {
  likely_eligible:   { label: 'Likely Eligible',   color: '#1a7f37', bg: '#d1fae5' },
  may_be_eligible:   { label: 'May Be Eligible',   color: '#92400e', bg: '#fef3c7' },
  likely_ineligible: { label: 'Review Needed',     color: '#991b1b', bg: '#fee2e2' },
};

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'eligibility' | 'tracks' | 'comparison' | 'howto';

interface EligibilityForm {
  disabilityRating:        string;
  hasMemorandumRating:     boolean;
  dischargeType:           VREDischargeType;
  hasEmploymentHandicap:   boolean;
  separationWithin12Years: boolean;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '24px 16px',
  fontFamily: 'var(--va-font-body)',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 6px',
};

const subheadingStyle: React.CSSProperties = {
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  margin: '0 0 4px',
  lineHeight: 1.5,
};

const cfrBadgeStyle: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  border: '1px solid var(--va-color-border)',
  borderRadius: '3px',
  padding: '1px 6px',
  marginTop: '6px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  borderBottom: '2px solid var(--va-color-border)',
  marginBottom: '28px',
  flexWrap: 'wrap',
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 18px',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  border: 'none',
  borderBottom: active ? '3px solid var(--va-color-old-glory-red)' : '3px solid transparent',
  background: 'none',
  color: active ? 'var(--va-color-old-glory-red)' : 'var(--va-color-text-secondary)',
  cursor: 'pointer',
  marginBottom: '-2px',
  transition: 'color 0.15s, border-color 0.15s',
});

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 16px',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px 24px',
  marginBottom: '16px',
};

const formGroupStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  color: 'var(--va-color-text-primary)',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '200px',
  height: '44px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '0 12px',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '360px',
  height: '44px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '0 12px',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  marginBottom: '12px',
};

const checkboxLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.5,
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  height: '44px',
  padding: '0 24px',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  backgroundColor: 'var(--va-color-old-glory-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--va-radius-card)',
  cursor: 'pointer',
};

const resultBannerStyle = (status: VREEligibilityResult['status']): React.CSSProperties => ({
  backgroundColor: ELIGIBILITY_STATUS_CONFIG[status].bg,
  border: `1px solid ${ELIGIBILITY_STATUS_CONFIG[status].color}`,
  borderRadius: 'var(--va-radius-card)',
  padding: '16px 20px',
  marginBottom: '16px',
});

const resultStatusStyle = (status: VREEligibilityResult['status']): React.CSSProperties => ({
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  fontWeight: 700,
  color: ELIGIBILITY_STATUS_CONFIG[status].color,
  margin: '0 0 8px',
});

const listStyle: React.CSSProperties = {
  margin: '8px 0 0',
  paddingLeft: '20px',
  lineHeight: 1.7,
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
};

const trackGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: '16px',
  marginBottom: '24px',
};

const trackCardStyle = (selected: boolean): React.CSSProperties => ({
  background: selected ? 'var(--va-color-field-blue)' : 'var(--va-color-aged-canvas)',
  border: `2px solid ${selected ? 'var(--va-color-old-glory-blue)' : 'var(--va-color-border)'}`,
  borderRadius: 'var(--va-radius-card)',
  padding: '16px',
  cursor: 'pointer',
  transition: 'border-color 0.15s, background 0.15s',
});

const trackTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-body)',
  fontWeight: 700,
  color: 'var(--va-color-text-primary)',
  margin: '0 0 6px',
};

const trackShortDescStyle: React.CSSProperties = {
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  margin: 0,
  lineHeight: 1.5,
};

const trackDetailStyle: React.CSSProperties = {
  background: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '24px',
  marginTop: '4px',
};

const prosConsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginTop: '16px',
};

const prosConsBoxStyle = (type: 'pros' | 'cons'): React.CSSProperties => ({
  background: type === 'pros' ? '#f0fdf4' : '#fff7ed',
  border: `1px solid ${type === 'pros' ? '#bbf7d0' : '#fed7aa'}`,
  borderRadius: '6px',
  padding: '12px 16px',
});

const prosConsTitleStyle = (type: 'pros' | 'cons'): React.CSSProperties => ({
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: type === 'pros' ? '#15803d' : '#c2410c',
  margin: '0 0 8px',
});

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--va-text-small)',
  fontFamily: 'var(--va-font-body)',
};

const thStyle: React.CSSProperties = {
  background: 'var(--va-color-old-glory-blue)',
  color: '#fff',
  fontFamily: 'var(--va-font-heading)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 'var(--va-text-caption)',
};

const tdFactorStyle: React.CSSProperties = {
  fontWeight: 600,
  fontFamily: 'var(--va-font-heading)',
  color: 'var(--va-color-text-primary)',
  padding: '10px 14px',
  verticalAlign: 'top',
  borderBottom: '1px solid var(--va-color-border)',
  width: '22%',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  verticalAlign: 'top',
  borderBottom: '1px solid var(--va-color-border)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.55,
};

const warningBannerStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '2px solid #dc2626',
  borderRadius: 'var(--va-radius-card)',
  padding: '16px 20px',
  marginBottom: '20px',
};

const warningTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontWeight: 700,
  fontSize: 'var(--va-text-body)',
  color: '#991b1b',
  margin: '0 0 6px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const stepNumberStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  background: 'var(--va-color-old-glory-blue)',
  color: '#fff',
  fontFamily: 'var(--va-font-heading)',
  fontWeight: 700,
  fontSize: 'var(--va-text-body)',
  flexShrink: 0,
};

const stepRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  alignItems: 'flex-start',
  marginBottom: '20px',
};

const stepBodyStyle: React.CSSProperties = {
  flex: 1,
};

const stepTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontWeight: 700,
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 6px',
};

const stepMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap',
  marginTop: '8px',
};

const metaBadgeStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  background: 'var(--va-color-field-blue)',
  border: '1px solid var(--va-color-border)',
  borderRadius: '3px',
  padding: '1px 7px',
};

const errorStyle: React.CSSProperties = {
  color: 'var(--va-color-old-glory-red)',
  fontSize: 'var(--va-text-body)',
  padding: '24px 0',
};

const loadingStyle: React.CSSProperties = {
  color: 'var(--va-color-text-secondary)',
  fontSize: 'var(--va-text-body)',
  padding: '48px 0',
  textAlign: 'center',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const TrackCard = React.memo(function TrackCard({
  track,
  selected,
  onSelect,
}: {
  readonly track: VRETrack;
  readonly selected: boolean;
  readonly onSelect: (id: VRETrackId) => void;
}) {
  return (
    <div
      style={trackCardStyle(selected)}
      onClick={() => onSelect(track.id)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Select track: ${track.name}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(track.id); }}
    >
      <p style={trackTitleStyle}>{track.name}</p>
      <p style={trackShortDescStyle}>{track.shortDescription}</p>
    </div>
  );
});

function TrackDetail({ track }: { readonly track: VRETrack }) {
  return (
    <div style={trackDetailStyle} aria-label={`Details for track: ${track.name}`}>
      <h3 style={sectionHeadingStyle}>{track.name}</h3>
      <p style={{ fontSize: 'var(--va-text-body)', color: 'var(--va-color-text-primary)', lineHeight: 1.6, margin: '0 0 12px' }}>
        {track.fullDescription}
      </p>
      <p style={{ fontSize: 'var(--va-text-small)', color: 'var(--va-color-text-secondary)', margin: '0 0 16px' }}>
        <strong>Best for:</strong> {track.bestFor}
      </p>

      <div style={prosConsGridStyle}>
        <div style={prosConsBoxStyle('pros')}>
          <p style={prosConsTitleStyle('pros')}>Advantages</p>
          <ul style={{ ...listStyle, color: '#166534' }}>
            {track.prosCons.pros.map((pro, i) => <li key={i}>{pro}</li>)}
          </ul>
        </div>
        <div style={prosConsBoxStyle('cons')}>
          <p style={prosConsTitleStyle('cons')}>Considerations</p>
          <ul style={{ ...listStyle, color: '#9a3412' }}>
            {track.prosCons.cons.map((con, i) => <li key={i}>{con}</li>)}
          </ul>
        </div>
      </div>

      <span style={{ ...cfrBadgeStyle, marginTop: '16px', display: 'inline-block' }}>{track.cfrCitation}</span>
    </div>
  );
}

// ── Tab panels ─────────────────────────────────────────────────────────────────

function EligibilityPanel() {
  const [form, setForm] = useState<EligibilityForm>({
    disabilityRating:        '',
    hasMemorandumRating:     false,
    dischargeType:           'honorable',
    hasEmploymentHandicap:   false,
    separationWithin12Years: true,
  });
  const [result, setResult]   = useState<VREEligibilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleCheck = useCallback(() => {
    const rating = parseInt(form.disabilityRating, 10);
    if (isNaN(rating) || rating < 0 || rating > 100) {
      setError('Please enter a disability rating between 0 and 100.');
      return;
    }
    setError(null);
    setLoading(true);

    void apiClient.checkVREEligibility({
      disabilityRating:        rating,
      hasMemorandumRating:     form.hasMemorandumRating,
      dischargeType:           form.dischargeType,
      hasEmploymentHandicap:   form.hasEmploymentHandicap,
      separationWithin12Years: form.separationWithin12Years,
    })
      .then(r => setResult(r))
      .catch(() => setError('Could not check eligibility. Please try again.'))
      .finally(() => setLoading(false));
  }, [form]);

  return (
    <div>
      <div style={cardStyle}>
        <h2 style={sectionHeadingStyle}>Check Your Basic Eligibility</h2>
        <p style={{ fontSize: 'var(--va-text-small)', color: 'var(--va-color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
          Answer a few questions to see if you likely meet the basic VR&E eligibility requirements.
          This is educational guidance — your VR&E counselor makes the official determination.
        </p>

        <div style={formGroupStyle}>
          <label htmlFor="disability-rating" style={labelStyle}>Current VA Disability Rating (%)</label>
          <input
            id="disability-rating"
            type="number"
            min={0}
            max={100}
            value={form.disabilityRating}
            onChange={e => setForm(f => ({ ...f, disabilityRating: e.target.value }))}
            style={inputStyle}
            placeholder="e.g. 70"
            aria-label="VA disability rating percentage"
          />
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="discharge-type" style={labelStyle}>Discharge Type</label>
          <select
            id="discharge-type"
            value={form.dischargeType}
            onChange={e => setForm(f => ({ ...f, dischargeType: e.target.value as VREDischargeType }))}
            style={selectStyle}
            aria-label="Discharge type"
          >
            {DISCHARGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={formGroupStyle}>
          <p style={labelStyle}>Additional Factors</p>

          <div style={checkboxRowStyle}>
            <input
              id="memorandum-rating"
              type="checkbox"
              checked={form.hasMemorandumRating}
              onChange={e => setForm(f => ({ ...f, hasMemorandumRating: e.target.checked }))}
              aria-label="I have a memorandum rating (pre-discharge rating)"
            />
            <label htmlFor="memorandum-rating" style={checkboxLabelStyle}>
              I have a memorandum rating (pre-discharge rating, before final separation)
            </label>
          </div>

          <div style={checkboxRowStyle}>
            <input
              id="employment-handicap"
              type="checkbox"
              checked={form.hasEmploymentHandicap}
              onChange={e => setForm(f => ({ ...f, hasEmploymentHandicap: e.target.checked }))}
              aria-label="My disability significantly limits my ability to prepare for, obtain, or maintain employment"
            />
            <label htmlFor="employment-handicap" style={checkboxLabelStyle}>
              My service-connected disability significantly limits my ability to prepare for, obtain, or maintain employment
            </label>
          </div>

          <div style={checkboxRowStyle}>
            <input
              id="within-12-years"
              type="checkbox"
              checked={form.separationWithin12Years}
              onChange={e => setForm(f => ({ ...f, separationWithin12Years: e.target.checked }))}
              aria-label="I separated from service within the last 12 years"
            />
            <label htmlFor="within-12-years" style={checkboxLabelStyle}>
              I separated from service within the last 12 years
            </label>
          </div>
        </div>

        {error && <p style={{ color: 'var(--va-color-old-glory-red)', fontSize: 'var(--va-text-small)', marginBottom: '12px' }} role="alert">{error}</p>}

        <button
          type="button"
          onClick={handleCheck}
          style={primaryButtonStyle}
          disabled={loading}
          aria-label="Check VR&E eligibility"
        >
          {loading ? 'Checking…' : 'Check Eligibility'}
        </button>
      </div>

      {result && (
        <div>
          <div style={resultBannerStyle(result.status)} role="status" aria-live="polite">
            <p style={resultStatusStyle(result.status)}>{ELIGIBILITY_STATUS_CONFIG[result.status].label}</p>
            <ul style={listStyle}>
              {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>

          <div style={cardStyle}>
            <h3 style={{ ...sectionHeadingStyle, fontSize: 'var(--va-text-body)' }}>Recommended Next Steps</h3>
            <ol style={listStyle}>
              {result.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            <span style={{ ...cfrBadgeStyle, marginTop: '12px', display: 'inline-block' }}>{result.cfrCitation}</span>
          </div>

          <p style={{ fontSize: 'var(--va-text-caption)', color: 'var(--va-color-text-secondary)', marginTop: '8px', lineHeight: 1.5 }}>
            This result is for educational purposes only. Your VR&E counselor makes the official eligibility determination based on your full record.
          </p>
        </div>
      )}
    </div>
  );
}

function TracksPanel({ guide }: { readonly guide: VREGuideResponse }) {
  const [selectedTrackId, setSelectedTrackId] = useState<VRETrackId | null>(null);

  const selectedTrack = guide.tracks.find(t => t.id === selectedTrackId) ?? null;

  return (
    <div>
      <p style={{ fontSize: 'var(--va-text-body)', color: 'var(--va-color-text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>
        VR&E offers 5 service tracks. Your VR&E counselor determines which track applies based on your
        employment handicap evaluation — not your disability rating alone. Select a track below to learn more.
      </p>

      <div style={trackGridStyle} role="list" aria-label="VR&E service tracks">
        {guide.tracks.map(track => (
          <div key={track.id} role="listitem">
            <TrackCard
              track={track}
              selected={selectedTrackId === track.id}
              onSelect={id => setSelectedTrackId(prev => prev === id ? null : id)}
            />
          </div>
        ))}
      </div>

      {selectedTrack && <TrackDetail track={selectedTrack} />}

      {!selectedTrack && (
        <p style={{ fontSize: 'var(--va-text-small)', color: 'var(--va-color-text-secondary)', fontStyle: 'italic' }}>
          Select a track above to see details, pros, cons, and best-fit guidance.
        </p>
      )}
    </div>
  );
}

function ComparisonPanel({ guide }: { readonly guide: VREGuideResponse }) {
  return (
    <div>
      <div style={warningBannerStyle} role="alert" aria-label="Irrevocable election warning">
        <p style={warningTitleStyle}>Irrevocable Election Warning</p>
        <p style={{ fontSize: 'var(--va-text-body)', color: '#991b1b', margin: 0, lineHeight: 1.6 }}>
          {guide.comparison.irrevocableWarning}
        </p>
      </div>

      <p style={{ fontSize: 'var(--va-text-small)', color: 'var(--va-color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Chapter 31 (VR&E) and Chapter 33 (Post-9/11 GI Bill) can sometimes be used together — Ch.31 is used first,
        preserving Ch.33 months. Review both carefully with a VSO before making any election.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={tableStyle} aria-label="Chapter 31 vs Chapter 33 comparison">
          <thead>
            <tr>
              <th style={thStyle}>Factor</th>
              <th style={thStyle}>Chapter 31 — VR&E</th>
              <th style={thStyle}>Chapter 33 — Post-9/11 GI Bill</th>
            </tr>
          </thead>
          <tbody>
            {guide.comparison.rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--va-color-aged-canvas)' : '#f9fafb' }}>
                <td style={tdFactorStyle}>{row.factor}</td>
                <td style={tdStyle}>{row.chapter31}</td>
                <td style={tdStyle}>{row.chapter33}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 'var(--va-text-caption)', color: 'var(--va-color-text-secondary)', marginTop: '12px', lineHeight: 1.5 }}>
        Source: 38 CFR Part 21, Subpart C. Educational comparison only — benefit amounts change annually.
        Verify current rates at va.gov before making any election.
      </p>
    </div>
  );
}

function HowToPanel({ guide }: { readonly guide: VREGuideResponse }) {
  return (
    <div>
      <p style={{ fontSize: 'var(--va-text-body)', color: 'var(--va-color-text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
        The VR&E application process typically takes 4–12 weeks from application to approved rehabilitation plan.
        Follow each step in order — skipping ahead can delay your benefits.
      </p>

      {guide.applicationSteps.map(step => (
        <div key={step.stepNumber} style={stepRowStyle}>
          <div style={stepNumberStyle} aria-hidden="true">{step.stepNumber}</div>
          <div style={stepBodyStyle}>
            <p style={stepTitleStyle}>{step.title}</p>
            <p style={{ fontSize: 'var(--va-text-body)', color: 'var(--va-color-text-primary)', margin: '0 0 8px', lineHeight: 1.6 }}>
              {step.description}
            </p>
            <ul style={{ ...listStyle, margin: '0 0 8px' }}>
              {step.actionItems.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
            <div style={stepMetaStyle}>
              {step.formNumber && <span style={metaBadgeStyle}>{step.formNumber}</span>}
              {step.timeEstimate && <span style={metaBadgeStyle}>{step.timeEstimate}</span>}
            </div>
          </div>
        </div>
      ))}

      <div style={{ ...cardStyle, background: '#f0f9ff', borderColor: '#bae6fd', marginTop: '8px' }}>
        <p style={{ fontFamily: 'var(--va-font-heading)', fontWeight: 700, fontSize: 'var(--va-text-body)', color: '#0369a1', margin: '0 0 8px' }}>
          Need help with your application?
        </p>
        <p style={{ fontSize: 'var(--va-text-body)', color: 'var(--va-color-text-primary)', margin: 0, lineHeight: 1.6 }}>
          A VA-accredited Veterans Service Organization (VSO) representative can help you prepare and submit your
          VR&E application at no cost. Find one at va.gov/vso.
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function VREPage() {
  const [activeTab, setActiveTab] = useState<TabId>('eligibility');
  const [guide, setGuide]         = useState<VREGuideResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    void apiClient.getVREGuide()
      .then(g => setGuide(g))
      .catch(() => setError('Failed to load the VR&E guide. Please refresh to try again.'))
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = useCallback((id: TabId) => {
    setActiveTab(id);
  }, []);

  if (loading) return <p style={loadingStyle}>Loading VR&E guide…</p>;
  if (error)   return <p style={errorStyle} role="alert">{error}</p>;
  if (!guide)  return null;

  return (
    <div style={pageStyle}>
      <AIDisclosureBanner />
      <CrisisLineBanner />

      <div style={{ marginBottom: '24px' }}>
        <h1 style={headingStyle}>{PAGE_HEADING}</h1>
        <p style={subheadingStyle}>{PAGE_SUBHEADING}</p>
        <span style={cfrBadgeStyle}>{CFR_CITATION}</span>
      </div>

      <nav aria-label="VR&E guide sections">
        <div style={tabBarStyle} role="tablist">
          {TAB_LABELS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => handleTabChange(tab.id)}
              style={tabStyle(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'eligibility' && <EligibilityPanel />}
        {activeTab === 'tracks'      && <TracksPanel guide={guide} />}
        {activeTab === 'comparison'  && <ComparisonPanel guide={guide} />}
        {activeTab === 'howto'       && <HowToPanel guide={guide} />}
      </div>
    </div>
  );
}
