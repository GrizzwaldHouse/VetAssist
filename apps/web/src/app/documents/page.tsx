// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Document review page — file upload with OCR, paste text, Grammarly-style inline diff review

'use client';

import React, { useState, useCallback } from 'react';
import { AIDisclosureBanner, CrisisLineBanner, PIIWarningModal, ScoreRing, DocumentDropZone } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type { DocumentReviewResponse, InlineReviewResult } from '../../lib/apiClient.js';
import type { UploadStatus } from '@vetassist/shared-types';
import { InlineDiffEditor } from '../../components/InlineDiffEditor.js';
import { ShareDocumentModal } from '../../components/ShareDocumentModal.js';

// Text limits — must match API route constants
const DOC_TEXT_MIN = 1;
const DOC_TEXT_MAX = 20_000;

// Display text constants
const PAGE_HEADING              = 'Document Review';
const PAGE_SUBHEADING           = 'Upload a file or paste text — we\'ll score your VA document and suggest improvements';
const TEXTAREA_PLACEHOLDER      = 'Paste your statement of service, personal statement, buddy letter, or other VA document here…';
const SUBMIT_LABEL              = 'Review Document';
const SUBMITTING_LABEL          = 'Reviewing…';
const MODE_ENCOURAGING          = 'Encouraging';
const MODE_STRICT               = 'Strict';
const SCORE_LABEL               = 'Overall';
const SUGGESTIONS_HEADING       = 'Suggestions';
const NO_SUGGESTIONS_TEXT       = 'No suggestions — your document looks solid!';
const PII_DETECTED_TYPE         = 'PII';
const UPLOAD_SECTION_HEADING    = 'Upload a Document';
const UPLOAD_STATUS_UPLOADING   = 'Uploading file…';
const UPLOAD_STATUS_OCR         = 'Extracting text (OCR)…';
const UPLOAD_STATUS_SCANNING    = 'Scanning for sensitive information…';
const UPLOAD_STATUS_READY       = 'File ready — text extracted below';
const UPLOAD_STATUS_ERROR       = 'Upload failed. Please try again or paste text directly.';
const UPLOAD_OVERSIZED_PREFIX   = 'File exceeds 25 MB limit: ';
const TEXT_SECTION_HEADING      = 'Or Paste Text Directly';
const PII_REDACTED_NOTICE       = 'Sensitive information was detected and redacted from your document before processing.';
const REVIEW_MODE_LABEL         = 'Review Mode';
const REVIEW_MODE_CLASSIC       = 'Score + Tips';
const REVIEW_MODE_INLINE        = 'Inline Diff';
const INLINE_REVIEW_NOTE        = 'Inline mode shows per-sentence accept/reject suggestions with a live audit trail.';
const SHARE_BTN_LABEL           = 'Share Document';
const SHARE_DOC_TITLE_DEFAULT   = 'VA Document';

// Upload status step map — drives the progress indicator
const UPLOAD_STATUS_MESSAGES: Readonly<Record<UploadStatus, string>> = {
  uploading:      UPLOAD_STATUS_UPLOADING,
  ocr_processing: UPLOAD_STATUS_OCR,
  pii_scanning:   UPLOAD_STATUS_SCANNING,
  ready:          UPLOAD_STATUS_READY,
  error:          UPLOAD_STATUS_ERROR,
};

// Priority badge colors — mapped to design tokens
const PRIORITY_COLORS: Readonly<Record<string, string>> = {
  high:   'var(--va-color-old-glory-red)',
  medium: 'var(--va-color-score-mid)',
  low:    'var(--va-color-score-high)',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  maxWidth: '760px',
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
  margin: 0,
};

const phaseNoteStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
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

const modeRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
};

const modeLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-primary)',
  fontWeight: 600,
};

const modeButtonBase: React.CSSProperties = {
  padding: '6px 16px',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  cursor: 'pointer',
  backgroundColor: 'var(--va-color-aged-canvas)',
  color: 'var(--va-color-text-primary)',
};

const modeButtonActiveStyle: React.CSSProperties = {
  ...modeButtonBase,
  backgroundColor: 'var(--va-color-old-glory-blue, #1a2744)',
  color: 'var(--va-color-star-white)',
  border: '1px solid transparent',
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

const resultsCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const ringRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '32px',
  flexWrap: 'wrap',
};

const categoriesGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
};

const categoryCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-background)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const categoryNameStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const categoryScoreStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-2)',
  color: 'var(--va-color-text-primary)',
};

const categoryFeedbackStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  lineHeight: 1.4,
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: 0,
};

const suggestionItemStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  padding: '12px',
  backgroundColor: 'var(--va-color-background)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
};

const suggestionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const priorityBadgeStyle = (priority: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontSize: 'var(--va-text-caption)',
  fontFamily: 'var(--va-font-mono)',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: PRIORITY_COLORS[priority] ?? 'var(--va-color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

const suggestionTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  lineHeight: 1.5,
};

const citationChipStyle: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'var(--va-color-field-blue)',
  color: 'var(--va-color-text-secondary)',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  padding: '2px 8px',
  borderRadius: '3px',
  border: '1px solid var(--va-color-border)',
};

const noSuggestionsStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
};

const sectionHeadingSmallStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 12px',
  letterSpacing: '0.02em',
};

const uploadStatusStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  margin: '8px 0 0',
};

const uploadStatusErrorStyle: React.CSSProperties = {
  ...uploadStatusStyle,
  color: 'var(--va-color-old-glory-red)',
  fontStyle: 'normal',
};

const piiNoticeStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-score-mid)',
  border: '1px solid var(--va-color-score-mid)',
  borderRadius: 'var(--va-radius-card)',
  padding: '10px 14px',
  margin: '8px 0 0',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const CategoryCard = React.memo(function CategoryCard({
  name,
  score,
  feedback,
}: {
  readonly name: string;
  readonly score: number;
  readonly feedback: string;
}) {
  return (
    <div style={categoryCardStyle}>
      <span style={categoryNameStyle}>{name.replace('_', ' ')}</span>
      <span style={categoryScoreStyle}>{score}%</span>
      <span style={categoryFeedbackStyle}>{feedback}</span>
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documentText, setDocumentText]       = useState('');
  const [scoringMode, setScoringMode]         = useState<'encouraging' | 'strict'>('encouraging');
  const [scoreResult, setScoreResult]         = useState<DocumentReviewResponse | null>(null);
  const [inlineResult, setInlineResult]       = useState<InlineReviewResult | null>(null);
  // reviewMode: 'classic' = score + tips, 'inline' = per-span accept/reject diff editor
  const [reviewMode, setReviewMode]           = useState<'classic' | 'inline'>('classic');
  const [isLoading, setIsLoading]             = useState(false);
  const [hasPIIWarning, setHasPIIWarning]     = useState(false);
  const [isCrisisActive, setIsCrisisActive]   = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  // Upload state — tracks the current upload pipeline stage
  const [uploadStatus, setUploadStatus]       = useState<UploadStatus | null>(null);
  const [uploadError, setUploadError]         = useState<string | null>(null);
  const [piiRedactedByUpload, setPiiRedactedByUpload] = useState(false);
  const [shareOpen, setShareOpen]             = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = documentText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);
    setScoreResult(null);
    setInlineResult(null);
    setHasPIIWarning(false);
    setIsCrisisActive(false);

    try {
      if (reviewMode === 'inline') {
        const result = await apiClient.reviewDocumentInline(trimmed, scoringMode);
        if ((result as unknown as { crisisDetected?: boolean }).crisisDetected) {
          setIsCrisisActive(true);
          return;
        }
        setInlineResult(result);
        return;
      }

      const result = await apiClient.reviewDocument({
        text: trimmed,
        scoringMode,
      });

      // Crisis flag may be embedded in the response when the handler detects distress
      if ((result as unknown as { crisisDetected?: boolean }).crisisDetected) {
        setIsCrisisActive(true);
        return;
      }

      setScoreResult(result);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'ApiError') {
        const apiErr = err as unknown as { status: number; message: string };
        if (apiErr.status === 422) {
          setHasPIIWarning(true);
          return;
        }
      }
      setError('Review failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [documentText, scoringMode, isLoading]);

  const handlePIIDismiss = useCallback(() => {
    setHasPIIWarning(false);
    setDocumentText('');
  }, []);

  // Handle files accepted by DocumentDropZone — upload each sequentially, populate textarea on ready
  const handleFilesAccepted = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Use the first file — multi-file: iterate if needed in a future sprint
    const file = files[0];
    if (!file) return;

    setUploadError(null);
    setPiiRedactedByUpload(false);
    setUploadStatus('uploading');

    try {
      const response = await apiClient.uploadDocument(file);

      // Status transitions are driven by the API response — OCR runs server-side
      setUploadStatus(response.status);

      if (response.status === 'ready') {
        // The API returns extracted text in the message field when OCR is complete
        // Real implementation: poll /documents/:id or use SSE — for now use message as extracted text
        setDocumentText(response.message);
        if (response.piiRedacted) {
          setPiiRedactedByUpload(true);
        }
      } else if (response.status === 'error') {
        setUploadError(UPLOAD_STATUS_ERROR);
      }
    } catch {
      setUploadStatus('error');
      setUploadError(UPLOAD_STATUS_ERROR);
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

      {/* File upload zone — Phase 2 upload + OCR pipeline */}
      <section aria-label="Upload a document file">
        <h2 style={sectionHeadingSmallStyle}>{UPLOAD_SECTION_HEADING}</h2>
        <DocumentDropZone
          onFilesAccepted={(files) => void handleFilesAccepted(files)}
          onOversizedFile={handleOversizedFile}
          disabled={isLoading}
        />
        {/* Upload progress status */}
        {uploadStatus && uploadStatus !== 'error' && (
          <p style={uploadStatusStyle} aria-live="polite" aria-atomic="true">
            {UPLOAD_STATUS_MESSAGES[uploadStatus]}
          </p>
        )}
        {/* PII redaction notice — shown when the API redacted content before extraction */}
        {piiRedactedByUpload && (
          <p style={piiNoticeStyle} role="status">{PII_REDACTED_NOTICE}</p>
        )}
        {uploadError && (
          <p style={uploadStatusErrorStyle} role="alert">{uploadError}</p>
        )}
      </section>

      {/* Review mode toggle — classic score vs inline diff editor */}
      <div style={modeRowStyle} role="group" aria-label={REVIEW_MODE_LABEL}>
        <span style={modeLabelStyle}>{REVIEW_MODE_LABEL}:</span>
        <button
          type="button"
          style={reviewMode === 'classic' ? modeButtonActiveStyle : modeButtonBase}
          onClick={() => setReviewMode('classic')}
          aria-pressed={reviewMode === 'classic'}
        >
          {REVIEW_MODE_CLASSIC}
        </button>
        <button
          type="button"
          style={reviewMode === 'inline' ? modeButtonActiveStyle : modeButtonBase}
          onClick={() => setReviewMode('inline')}
          aria-pressed={reviewMode === 'inline'}
        >
          {REVIEW_MODE_INLINE}
        </button>
        {reviewMode === 'inline' && (
          <span style={{ fontFamily: 'var(--va-font-body)', fontSize: 'var(--va-text-caption)', color: 'var(--va-color-text-secondary)', fontStyle: 'italic' }}>
            {INLINE_REVIEW_NOTE}
          </span>
        )}
      </div>

      {/* Scoring mode toggle */}
      <div style={modeRowStyle} role="group" aria-label="Scoring mode">
        <span style={modeLabelStyle}>Scoring:</span>
        <button
          type="button"
          style={scoringMode === 'encouraging' ? modeButtonActiveStyle : modeButtonBase}
          onClick={() => setScoringMode('encouraging')}
          aria-pressed={scoringMode === 'encouraging'}
        >
          {MODE_ENCOURAGING}
        </button>
        <button
          type="button"
          style={scoringMode === 'strict' ? modeButtonActiveStyle : modeButtonBase}
          onClick={() => setScoringMode('strict')}
          aria-pressed={scoringMode === 'strict'}
        >
          {MODE_STRICT}
        </button>
      </div>

      {/* Document textarea — pre-populated by OCR or typed/pasted manually */}
      <section aria-label="Document text input">
        <h2 style={sectionHeadingSmallStyle}>{TEXT_SECTION_HEADING}</h2>
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          style={textareaStyle}
          placeholder={TEXTAREA_PLACEHOLDER}
          maxLength={DOC_TEXT_MAX}
          aria-label="Document text"
          aria-describedby="char-count"
          disabled={isLoading}
        />
        <p id="char-count" style={{ ...phaseNoteStyle, margin: '4px 0 0' }}>
          {charCount.toLocaleString()} / {DOC_TEXT_MAX.toLocaleString()} characters
        </p>
      </section>

      <button
        type="button"
        style={submitDisabled ? submitButtonDisabledStyle : submitButtonStyle}
        onClick={() => void handleSubmit()}
        disabled={submitDisabled}
        aria-label="Submit document for review"
      >
        {isLoading ? SUBMITTING_LABEL : SUBMIT_LABEL}
      </button>

      {error && <p style={errorStyle} role="alert">{error}</p>}

      {/* Classic results panel — score ring + category breakdown + suggestion tips */}
      {scoreResult && reviewMode === 'classic' && (
        <div style={resultsCardStyle} aria-label="Review results">

          <div style={ringRowStyle}>
            <ScoreRing score={scoreResult.overall} label={SCORE_LABEL} size={140} />
            <div style={categoriesGridStyle}>
              {scoreResult.categories.map((cat) => (
                <CategoryCard
                  key={cat.name}
                  name={cat.name}
                  score={cat.score}
                  feedback={cat.feedback}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 style={sectionHeadingStyle}>{SUGGESTIONS_HEADING}</h2>
            {scoreResult.suggestions.length === 0 ? (
              <p style={noSuggestionsStyle}>{NO_SUGGESTIONS_TEXT}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                {scoreResult.suggestions.map((suggestion) => (
                  <div key={suggestion.id} style={suggestionItemStyle}>
                    <div style={suggestionHeaderStyle}>
                      <span style={priorityBadgeStyle(suggestion.priority)}>{suggestion.priority}</span>
                      {suggestion.cfrCitation && (
                        <span style={citationChipStyle} aria-label={`Citation: ${suggestion.cfrCitation}`}>
                          {suggestion.cfrCitation}
                        </span>
                      )}
                    </div>
                    <p style={suggestionTextStyle}>{suggestion.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline diff results panel — per-span accept/reject editor with audit trail */}
      {inlineResult && reviewMode === 'inline' && (
        <div style={resultsCardStyle} aria-label="Inline diff review">
          <InlineDiffEditor result={inlineResult} originalText={documentText} />
        </div>
      )}

      {/* Share button — only shown after a review result exists */}
      {(scoreResult || inlineResult) && documentText.trim().length > 0 && (
        <button
          type="button"
          style={{ ...modeButtonBase, alignSelf: 'flex-start' }}
          onClick={() => setShareOpen(true)}
          aria-label={SHARE_BTN_LABEL}
        >
          {SHARE_BTN_LABEL}
        </button>
      )}

      {shareOpen && (
        <ShareDocumentModal
          documentContent={documentText}
          documentTitle={SHARE_DOC_TITLE_DEFAULT}
          onClose={() => setShareOpen(false)}
        />
      )}

      <PIIWarningModal
        isOpen={hasPIIWarning}
        detectedType={PII_DETECTED_TYPE}
        action="blocked"
        onDismiss={handlePIIDismiss}
      />
    </div>
  );
}
