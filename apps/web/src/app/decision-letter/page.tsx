// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-22
// Purpose: VA Decision Letter Explainer — upload/paste a decision letter, get plain-English per-condition breakdown

'use client';

import React, { useState, useCallback } from 'react';
import { AIDisclosureBanner, CrisisLineBanner, DocumentDropZone } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type { DecisionLetterAnalysis } from '../../lib/apiClient.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_HEADING           = 'Decision Letter Explainer';
const PAGE_SUBHEADING        = 'Paste or upload your VA decision letter — we\'ll translate the bureaucratic language into plain English';
const TEXTAREA_PLACEHOLDER   = 'Paste your VA decision letter here…';
const SUBMIT_LABEL           = 'Analyze Letter';
const SUBMITTING_LABEL       = 'Analyzing…';
const UPLOAD_SECTION_HEADING = 'Upload Your Letter';
const TEXT_SECTION_HEADING   = 'Or Paste Text Directly';
const DOC_TEXT_MIN           = 50;
const DOC_TEXT_MAX           = 50_000;
const UPLOAD_OVERSIZED_PREFIX = 'File exceeds 25 MB limit: ';

const OUTCOME_LABELS: Readonly<Record<string, string>> = {
  granted:  'GRANTED',
  denied:   'DENIED',
  deferred: 'DEFERRED',
};

const OUTCOME_COLORS: Readonly<Record<string, string>> = {
  granted:  'var(--va-color-score-high)',
  denied:   'var(--va-color-old-glory-red)',
  deferred: 'var(--va-color-score-mid)',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '800px',
  margin: '0 auto',
  padding: '24px var(--va-space-6)',
  gap: '24px',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
};

const subheadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  margin: '6px 0 0',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 12px',
  letterSpacing: '0.02em',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '200px',
  resize: 'vertical',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  lineHeight: 1.6,
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '14px',
  boxSizing: 'border-box',
};

const charCountStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  margin: '4px 0 0',
};

const submitButtonStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  height: '48px',
  padding: '0 28px',
  borderRadius: 'var(--va-radius-card)',
  border: 'none',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: 'var(--va-color-crisis-text)',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const submitButtonDisabledStyle: React.CSSProperties = {
  ...submitButtonStyle,
  opacity: 0.4,
  cursor: 'not-allowed',
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-old-glory-red)',
};

const piiNoticeStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-score-mid)',
  border: '1px solid var(--va-color-score-mid)',
  borderRadius: 'var(--va-radius-card)',
  padding: '10px 14px',
};

const summaryCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px 24px',
};

const summaryTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.65,
  margin: 0,
};

const conditionCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const conditionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '8px',
};

const conditionNameStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
};

const outcomeBadgeStyle = (outcome: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  borderRadius: '4px',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#fff',
  backgroundColor: OUTCOME_COLORS[outcome] ?? 'var(--va-color-text-secondary)',
});

const ratingChipStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
};

const conditionBodyStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.6,
  margin: 0,
};

const listLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 4px',
};

const chipListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const chipStyle = (variant: 'cited' | 'missing'): React.CSSProperties => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '3px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  backgroundColor: variant === 'cited' ? 'var(--va-color-field-blue)' : 'rgba(180,30,30,0.1)',
  color: variant === 'cited' ? 'var(--va-color-text-secondary)' : 'var(--va-color-old-glory-red)',
  border: `1px solid ${variant === 'cited' ? 'var(--va-color-border)' : 'var(--va-color-old-glory-red)'}`,
});

const evidenceCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const ratingCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const combinedRatingDisplayStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
};

const combinedPercentStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: '3rem',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1,
};

const combinedLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
};

const calculationStepsStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  backgroundColor: 'var(--va-color-background)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '12px',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.6,
  margin: 0,
};

const appealCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const appealNameStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  fontWeight: 700,
  margin: 0,
};

const appealDeadlineStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-old-glory-red)',
  fontWeight: 600,
};

const appealDescStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.5,
};

const appealCfrStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  backgroundColor: 'var(--va-color-field-blue)',
  border: '1px solid var(--va-color-border)',
  borderRadius: '3px',
  padding: '2px 8px',
  alignSelf: 'flex-start',
};

const uploadErrorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-old-glory-red)',
  margin: '8px 0 0',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const ConditionCard = React.memo(function ConditionCard({
  condition,
}: {
  readonly condition: DecisionLetterAnalysis['conditions'][number];
}) {
  return (
    <div style={conditionCardStyle}>
      <div style={conditionHeaderStyle}>
        <h3 style={conditionNameStyle}>{condition.condition}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={outcomeBadgeStyle(condition.decision)}>
            {OUTCOME_LABELS[condition.decision] ?? condition.decision.toUpperCase()}
          </span>
          {condition.ratingPercent !== null && (
            <span style={ratingChipStyle} aria-label={`Rating: ${condition.ratingPercent}%`}>
              {condition.ratingPercent}%
            </span>
          )}
        </div>
      </div>

      {condition.effectiveDate && (
        <p style={{ ...conditionBodyStyle, fontSize: 'var(--va-text-small)', color: 'var(--va-color-text-secondary)' }}>
          Effective date: {condition.effectiveDate}
        </p>
      )}

      <p style={conditionBodyStyle}>{condition.reasoningPlainEnglish}</p>

      {condition.evidenceCited.length > 0 && (
        <div>
          <p style={listLabelStyle}>Evidence VA cited</p>
          <ul style={chipListStyle} aria-label="Evidence cited by VA">
            {condition.evidenceCited.map((e) => (
              <li key={e}><span style={chipStyle('cited')}>{e}</span></li>
            ))}
          </ul>
        </div>
      )}

      {condition.evidenceMissing.length > 0 && (
        <div>
          <p style={listLabelStyle}>Evidence that could strengthen your claim</p>
          <ul style={chipListStyle} aria-label="Missing evidence recommendations">
            {condition.evidenceMissing.map((e) => (
              <li key={e}><span style={chipStyle('missing')}>{e}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

const EvidenceSection = React.memo(function EvidenceSection({
  evidence,
}: {
  readonly evidence: DecisionLetterAnalysis['evidenceAnalysis'];
}) {
  return (
    <div style={evidenceCardStyle}>
      <h2 style={sectionHeadingStyle}>Evidence Analysis</h2>

      {evidence.cited.length > 0 && (
        <div>
          <p style={listLabelStyle}>What VA considered</p>
          <ul style={chipListStyle} aria-label="Evidence VA considered">
            {evidence.cited.map((e) => (
              <li key={e}><span style={chipStyle('cited')}>{e}</span></li>
            ))}
          </ul>
        </div>
      )}

      {evidence.missing.length > 0 && (
        <div>
          <p style={listLabelStyle}>Evidence gaps</p>
          <ul style={chipListStyle} aria-label="Missing evidence">
            {evidence.missing.map((e) => (
              <li key={e}><span style={chipStyle('missing')}>{e}</span></li>
            ))}
          </ul>
        </div>
      )}

      {evidence.recommendations.length > 0 && (
        <div>
          <p style={listLabelStyle}>Recommendations</p>
          <ul style={{ paddingLeft: '18px', margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {evidence.recommendations.map((r) => (
              <li key={r} style={{ fontFamily: 'var(--va-font-body)', fontSize: 'var(--va-text-body)', color: 'var(--va-color-text-primary)', lineHeight: 1.5 }}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

const RatingSection = React.memo(function RatingSection({
  rating,
}: {
  readonly rating: DecisionLetterAnalysis['combinedRating'];
}) {
  return (
    <div style={ratingCardStyle}>
      <h2 style={sectionHeadingStyle}>Combined Rating</h2>

      <div style={combinedRatingDisplayStyle}>
        <span style={combinedPercentStyle} aria-label={`Combined rating: ${rating.combinedPercent} percent`}>
          {rating.combinedPercent}%
        </span>
        <span style={combinedLabelStyle}>combined disability rating</span>
      </div>

      {rating.conditions.length > 0 && (
        <div>
          <p style={listLabelStyle}>Individual conditions</p>
          <ul style={{ ...chipListStyle, gap: '8px' }} aria-label="Individual condition ratings">
            {rating.conditions.map((c) => (
              <li key={c.name}>
                <span style={{ ...chipStyle('cited'), fontSize: 'var(--va-text-small)' }}>
                  {c.name}: {c.percent}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rating.calculationSteps && (
        <div>
          <p style={listLabelStyle}>How VA calculated this (whole-person method)</p>
          <pre style={calculationStepsStyle} aria-label="Rating calculation steps">
            {rating.calculationSteps}
          </pre>
        </div>
      )}
    </div>
  );
});

const AppealOptionsSection = React.memo(function AppealOptionsSection({
  options,
}: {
  readonly options: DecisionLetterAnalysis['appealOptions'];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={sectionHeadingStyle}>Your Appeal Options</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {options.map((opt) => (
          <div key={opt.name} style={appealCardStyle}>
            <p style={appealNameStyle}>{opt.name}</p>
            <p style={appealDeadlineStyle}>Deadline: {opt.deadline}</p>
            <p style={appealDescStyle}>{opt.description}</p>
            <span style={appealCfrStyle}>{opt.cfrCitation}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DecisionLetterPage() {
  const [documentText, setDocumentText]     = useState('');
  const [isLoading, setIsLoading]           = useState(false);
  const [analysis, setAnalysis]             = useState<DecisionLetterAnalysis | null>(null);
  const [isCrisisActive, setIsCrisisActive] = useState(false);
  const [piiRedacted, setPiiRedacted]       = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [uploadError, setUploadError]       = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = documentText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setIsCrisisActive(false);
    setPiiRedacted(false);

    try {
      const result = await apiClient.analyzeDecisionLetter(trimmed);

      if (result.crisisDetected) {
        setIsCrisisActive(true);
        return;
      }

      if (result.piiRedacted) setPiiRedacted(true);
      setAnalysis(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [documentText, isLoading]);

  const handleFilesAccepted = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    if (!file) return;

    setUploadError(null);

    try {
      const response = await apiClient.uploadDocument(file);
      if (response.status === 'ready') {
        setDocumentText(response.message);
        if (response.piiRedacted) setPiiRedacted(true);
      } else if (response.status === 'error') {
        setUploadError('Upload failed. Please try again or paste text directly.');
      }
    } catch {
      setUploadError('Upload failed. Please try again or paste text directly.');
    }
  }, []);

  const handleOversizedFile = useCallback((fileName: string) => {
    setUploadError(`${UPLOAD_OVERSIZED_PREFIX}${fileName}`);
  }, []);

  const charCount = documentText.length;
  const submitDisabled = isLoading || charCount < DOC_TEXT_MIN || charCount > DOC_TEXT_MAX;

  return (
    <div style={pageStyle}>
      {/* Required on all AI-powered screens */}
      <AIDisclosureBanner />

      {isCrisisActive && <CrisisLineBanner />}

      <div>
        <h1 style={headingStyle}>{PAGE_HEADING}</h1>
        <p style={subheadingStyle}>{PAGE_SUBHEADING}</p>
      </div>

      {/* File upload zone */}
      <section aria-label="Upload your decision letter file">
        <h2 style={sectionHeadingStyle}>{UPLOAD_SECTION_HEADING}</h2>
        <DocumentDropZone
          onFilesAccepted={(files) => void handleFilesAccepted(files)}
          onOversizedFile={handleOversizedFile}
          disabled={isLoading}
        />
        {uploadError && <p style={uploadErrorStyle} role="alert">{uploadError}</p>}
      </section>

      {/* Paste text zone */}
      <section aria-label="Paste decision letter text">
        <h2 style={sectionHeadingStyle}>{TEXT_SECTION_HEADING}</h2>
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          style={textareaStyle}
          placeholder={TEXTAREA_PLACEHOLDER}
          maxLength={DOC_TEXT_MAX}
          aria-label="Decision letter text"
          aria-describedby="dl-char-count"
          disabled={isLoading}
        />
        <p id="dl-char-count" style={charCountStyle}>
          {charCount.toLocaleString()} / {DOC_TEXT_MAX.toLocaleString()} characters
        </p>
      </section>

      {piiRedacted && !analysis && (
        <p style={piiNoticeStyle} role="status">
          Sensitive information was detected and redacted from your document before processing.
        </p>
      )}

      <button
        type="button"
        style={submitDisabled ? submitButtonDisabledStyle : submitButtonStyle}
        onClick={() => void handleSubmit()}
        disabled={submitDisabled}
        aria-label="Submit decision letter for analysis"
      >
        {isLoading ? SUBMITTING_LABEL : SUBMIT_LABEL}
      </button>

      {error && <p style={errorStyle} role="alert">{error}</p>}

      {/* Results */}
      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {piiRedacted && (
            <p style={piiNoticeStyle} role="status">
              Sensitive information was detected and redacted from your document before processing.
            </p>
          )}

          {/* Plain-English summary */}
          <div style={summaryCardStyle} aria-label="Decision summary">
            <h2 style={{ ...sectionHeadingStyle, margin: '0 0 12px' }}>Summary</h2>
            <p style={summaryTextStyle}>{analysis.summary}</p>
          </div>

          {/* Per-condition verdict cards */}
          {analysis.conditions.length > 0 && (
            <section aria-label="Per-condition decisions">
              <h2 style={sectionHeadingStyle}>Decisions by Condition</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {analysis.conditions.map((cond) => (
                  <ConditionCard key={cond.condition} condition={cond} />
                ))}
              </div>
            </section>
          )}

          {/* Evidence analysis */}
          <EvidenceSection evidence={analysis.evidenceAnalysis} />

          {/* Combined rating */}
          <RatingSection rating={analysis.combinedRating} />

          {/* Appeal options */}
          {analysis.appealOptions.length > 0 && (
            <AppealOptionsSection options={analysis.appealOptions} />
          )}

        </div>
      )}
    </div>
  );
}
