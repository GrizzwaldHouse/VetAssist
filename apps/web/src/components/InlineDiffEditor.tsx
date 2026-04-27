// InlineDiffEditor.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Grammarly-style inline diff editor — per-suggestion accept/reject with audit trail

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { InlineDiff, InlineReviewResult, AuditEntry, ReviewAuditTrail, DiffDecision } from '../lib/apiClient.js';

// ── Display constants — no inline string literals in JSX ─────────────────────

const HEADING_INLINE_REVIEW    = 'Inline Review';
const HEADING_DIFF_PANEL       = 'Suggestions';
const HEADING_AUDIT_TRAIL      = 'Audit Trail';
const HEADING_PREVIEW          = 'Document Preview';
const LABEL_ACCEPT             = 'Accept';
const LABEL_REJECT             = 'Reject';
const LABEL_UNDO               = 'Undo';
const LABEL_ACCEPT_ALL         = 'Accept All';
const LABEL_ACCEPT_ALL_CONFIRM = 'Confirm — Accept All';
const LABEL_CANCEL             = 'Cancel';
const LABEL_EXPORT_AUDIT       = 'Export Audit Trail';
const LABEL_SCORE              = 'Overall Score';
const LABEL_PENDING            = 'pending';
const LABEL_ACCEPTED           = 'accepted';
const LABEL_REJECTED           = 'rejected';
const LABEL_NO_DIFFS           = 'No suggestions — your document looks excellent!';
const LABEL_NEEDS_REVIEW_WARN  = 'This change alters the meaning of your statement. Review carefully before accepting.';
const LABEL_INSERTION          = '[insert here]';
const ARIA_DIFF_LIST           = 'Inline suggestions list';
const ARIA_AUDIT_LIST          = 'Audit trail';
const ARIA_PREVIEW             = 'Document with applied changes preview';

// Character limit for truncating original/suggested spans in diff cards
const SPAN_DISPLAY_LIMIT = 120;

// ── Risk level display config ─────────────────────────────────────────────────

const RISK_COLORS: Readonly<Record<string, string>> = {
  safe:         'var(--va-color-score-high)',
  moderate:     'var(--va-color-score-mid)',
  needs_review: 'var(--va-color-old-glory-red)',
};

const RISK_LABELS: Readonly<Record<string, string>> = {
  safe:         'Safe',
  moderate:     'Moderate',
  needs_review: 'Needs Review',
};

const PRIORITY_COLORS: Readonly<Record<string, string>> = {
  high:   'var(--va-color-old-glory-red)',
  medium: 'var(--va-color-score-mid)',
  low:    'var(--va-color-score-high)',
};

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  grammar:      'Grammar',
  specificity:  'Specificity',
  completeness: 'Completeness',
  va_alignment: 'VA Alignment',
  pii:          'PII',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const editorShellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  width: '100%',
};

const summaryRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  flexWrap: 'wrap',
  padding: '16px',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
};

const scoreCircleStyle = (score: number): React.CSSProperties => ({
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  fontWeight: 700,
  color: '#fff',
  backgroundColor: score >= 80
    ? 'var(--va-color-score-high)'
    : score >= 60
      ? 'var(--va-color-score-mid)'
      : 'var(--va-color-old-glory-red)',
  flexShrink: 0,
});

const scoreMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const scoreLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const scoreValueStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
};

const statsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  marginLeft: 'auto',
  flexWrap: 'wrap',
};

const statChipStyle = (color: string): React.CSSProperties => ({
  padding: '4px 12px',
  borderRadius: '20px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: color,
});

const panelHeadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-heading-3)',
  color: 'var(--va-color-text-primary)',
  margin: '0 0 12px',
};

const diffListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const diffCardStyle = (decision: DiffDecision): React.CSSProperties => ({
  border: `1px solid ${
    decision === 'accepted' ? 'var(--va-color-score-high)'
    : decision === 'rejected' ? 'var(--va-color-border)'
    : 'var(--va-color-border)'
  }`,
  borderRadius: 'var(--va-radius-card)',
  padding: '14px',
  backgroundColor: decision === 'accepted'
    ? 'rgba(34,139,34,0.06)'
    : decision === 'rejected'
      ? 'var(--va-color-background)'
      : 'var(--va-color-aged-canvas)',
  opacity: decision === 'rejected' ? 0.55 : 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  transition: 'opacity 0.15s, background-color 0.15s',
});

const diffHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

const badgeStyle = (bg: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  fontWeight: 600,
  color: '#fff',
  backgroundColor: bg,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
});

const diffSpanRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};

const spanBoxStyle = (variant: 'original' | 'suggested'): React.CSSProperties => ({
  padding: '8px 10px',
  borderRadius: '4px',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  lineHeight: 1.5,
  backgroundColor: variant === 'original' ? 'rgba(200,0,0,0.07)' : 'rgba(0,140,0,0.07)',
  border: `1px solid ${variant === 'original' ? 'rgba(200,0,0,0.20)' : 'rgba(0,140,0,0.20)'}`,
  color: variant === 'original' ? 'var(--va-color-old-glory-red)' : 'var(--va-color-score-high)',
  // Strikethrough on original, clean on suggested
  textDecoration: variant === 'original' ? 'line-through' : 'none',
  wordBreak: 'break-word',
});

const spanLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
  marginBottom: '4px',
};

const rationaleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  lineHeight: 1.5,
};

const cfrChipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '3px',
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-caption)',
  backgroundColor: 'var(--va-color-field-blue)',
  color: 'var(--va-color-text-secondary)',
  border: '1px solid var(--va-color-border)',
};

const warnBoxStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '4px',
  backgroundColor: 'rgba(200,0,0,0.07)',
  border: '1px solid rgba(200,0,0,0.25)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-old-glory-red)',
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap',
};

const actionBtnStyle = (variant: 'accept' | 'reject' | 'undo' | 'neutral'): React.CSSProperties => ({
  padding: '6px 16px',
  border: 'none',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  cursor: 'pointer',
  backgroundColor:
    variant === 'accept' ? 'var(--va-color-score-high)'
    : variant === 'reject' ? 'var(--va-color-border)'
    : variant === 'undo'   ? 'var(--va-color-field-blue)'
    : 'var(--va-color-aged-canvas)',
  color:
    variant === 'accept' ? '#fff'
    : variant === 'reject' ? 'var(--va-color-text-primary)'
    : 'var(--va-color-text-primary)',
});

const decisionBadgeStyle = (decision: DiffDecision): React.CSSProperties => ({
  marginLeft: 'auto',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  fontWeight: 600,
  color: decision === 'accepted'
    ? 'var(--va-color-score-high)'
    : decision === 'rejected'
      ? 'var(--va-color-text-secondary)'
      : 'var(--va-color-text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
});

const acceptAllRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  padding: '12px',
  backgroundColor: 'var(--va-color-field-blue)',
  borderRadius: 'var(--va-radius-card)',
  border: '1px solid var(--va-color-border)',
};

const acceptAllBtnStyle: React.CSSProperties = {
  padding: '8px 20px',
  border: 'none',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  cursor: 'pointer',
  backgroundColor: 'var(--va-color-old-glory-blue, #1a2744)',
  color: 'var(--va-color-star-white)',
  letterSpacing: '0.04em',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  cursor: 'pointer',
  backgroundColor: 'transparent',
  color: 'var(--va-color-text-primary)',
};

const auditSectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const auditEntryStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '10px 12px',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-caption)',
  color: 'var(--va-color-text-secondary)',
};

const previewBoxStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  lineHeight: 1.7,
  color: 'var(--va-color-text-primary)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const exportBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '8px 20px',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  cursor: 'pointer',
  backgroundColor: 'var(--va-color-aged-canvas)',
  color: 'var(--va-color-text-primary)',
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function truncate(text: string | null, limit: number): string {
  if (!text) return LABEL_INSERTION;
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

// Applies all accepted diffs to produce the final document text
function applyAcceptedDiffs(
  originalText: string,
  diffs: readonly InlineDiff[],
  decisions: ReadonlyMap<string, DiffDecision>,
): string {
  // Build sorted list of accepted diffs (by startOffset, descending — apply from end to avoid offset drift)
  const accepted = diffs
    .filter((d) => decisions.get(d.id) === 'accepted' && d.originalText !== null)
    .sort((a, b) => b.startOffset - a.startOffset);

  let result = originalText;
  for (const diff of accepted) {
    if (diff.originalText === null) continue;
    const replacement = diff.suggestedText ?? '';
    const idx = result.indexOf(diff.originalText);
    if (idx === -1) continue;
    result = result.slice(0, idx) + replacement + result.slice(idx + diff.originalText.length);
  }
  return result;
}

// Builds the audit trail for export
function buildAuditTrail(
  sessionId: string,
  originalText: string,
  diffs: readonly InlineDiff[],
  decisions: ReadonlyMap<string, DiffDecision>,
  decidedAt: ReadonlyMap<string, string>,
): ReviewAuditTrail {
  const entries: AuditEntry[] = diffs
    .filter((d) => decisions.get(d.id) !== 'pending')
    .map((d) => ({
      id: crypto.randomUUID(),
      diffId: d.id,
      decision: decisions.get(d.id) as 'accepted' | 'rejected',
      originalText: d.originalText,
      suggestedText: d.suggestedText,
      decidedAt: decidedAt.get(d.id) ?? new Date().toISOString(),
      rationale: d.rationale,
    }));

  // Simple document hash — length + first 32 chars — sufficient for audit identity
  const documentHash = `${originalText.length}-${originalText.slice(0, 32).replace(/\s/g, '_')}`;

  return {
    sessionId,
    documentHash,
    entries,
    completedAt: new Date().toISOString(),
    acceptedCount: entries.filter((e) => e.decision === 'accepted').length,
    rejectedCount: entries.filter((e) => e.decision === 'rejected').length,
    pendingCount: diffs.length - entries.length,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const DiffCard = React.memo(function DiffCard({
  diff,
  decision,
  onAccept,
  onReject,
  onUndo,
}: {
  readonly diff: InlineDiff;
  readonly decision: DiffDecision;
  readonly onAccept: (id: string) => void;
  readonly onReject: (id: string) => void;
  readonly onUndo: (id: string) => void;
}) {
  return (
    <div style={diffCardStyle(decision)} aria-label={`Suggestion: ${diff.category}`}>
      <div style={diffHeaderStyle}>
        <span style={badgeStyle(PRIORITY_COLORS[diff.priority] ?? 'gray')}>
          {diff.priority}
        </span>
        <span style={badgeStyle(RISK_COLORS[diff.riskLevel] ?? 'gray')}>
          {RISK_LABELS[diff.riskLevel]}
        </span>
        <span style={{ ...badgeStyle('var(--va-color-field-blue)'), color: 'var(--va-color-text-secondary)', border: '1px solid var(--va-color-border)' }}>
          {CATEGORY_LABELS[diff.category] ?? diff.category}
        </span>
        {diff.cfrCitation && (
          <span style={cfrChipStyle} aria-label={`Citation: ${diff.cfrCitation}`}>
            {diff.cfrCitation}
          </span>
        )}
      </div>

      {diff.riskLevel === 'needs_review' && decision === 'pending' && (
        <div style={warnBoxStyle} role="alert">{LABEL_NEEDS_REVIEW_WARN}</div>
      )}

      <div style={diffSpanRowStyle}>
        <div>
          <p style={spanLabelStyle}>Original</p>
          <div style={spanBoxStyle('original')}>
            {truncate(diff.originalText, SPAN_DISPLAY_LIMIT)}
          </div>
        </div>
        <div>
          <p style={spanLabelStyle}>Suggested</p>
          <div style={spanBoxStyle('suggested')}>
            {truncate(diff.suggestedText, SPAN_DISPLAY_LIMIT)}
          </div>
        </div>
      </div>

      <p style={rationaleStyle}>{diff.rationale}</p>

      <div style={actionRowStyle}>
        {decision === 'pending' && (
          <>
            <button
              type="button"
              style={actionBtnStyle('accept')}
              onClick={() => onAccept(diff.id)}
              aria-label={`Accept: ${diff.rationale}`}
            >
              {LABEL_ACCEPT}
            </button>
            <button
              type="button"
              style={actionBtnStyle('reject')}
              onClick={() => onReject(diff.id)}
              aria-label={`Reject suggestion`}
            >
              {LABEL_REJECT}
            </button>
          </>
        )}
        {decision !== 'pending' && (
          <button
            type="button"
            style={actionBtnStyle('undo')}
            onClick={() => onUndo(diff.id)}
            aria-label="Undo decision"
          >
            {LABEL_UNDO}
          </button>
        )}
        <span style={decisionBadgeStyle(decision)}>
          {decision !== 'pending' && decision}
        </span>
      </div>
    </div>
  );
});

// ── Main component ────────────────────────────────────────────────────────────

interface InlineDiffEditorProps {
  readonly result: InlineReviewResult;
  readonly originalText: string;
}

export function InlineDiffEditor({ result, originalText }: InlineDiffEditorProps) {
  // Per-diff decision state — pending until the veteran acts
  const [decisions, setDecisions] = useState<ReadonlyMap<string, DiffDecision>>(
    () => new Map(result.diffs.map((d) => [d.id, 'pending'])),
  );

  // Timestamps for audit trail — recorded when the veteran decides
  const [decidedAt, setDecidedAt] = useState<ReadonlyMap<string, string>>(new Map());

  // Two-step Accept All: first click shows confirm, second applies
  const [acceptAllPending, setAcceptAllPending] = useState(false);

  const decide = useCallback((id: string, decision: 'accepted' | 'rejected') => {
    setDecisions((prev) => new Map([...prev, [id, decision]]));
    setDecidedAt((prev) => new Map([...prev, [id, new Date().toISOString()]]));
    setAcceptAllPending(false);
  }, []);

  const undo = useCallback((id: string) => {
    setDecisions((prev) => new Map([...prev, [id, 'pending']]));
  }, []);

  const handleAcceptAll = useCallback(() => {
    if (!acceptAllPending) {
      setAcceptAllPending(true);
      return;
    }
    const now = new Date().toISOString();
    const all = new Map(result.diffs.map((d) => [d.id, 'accepted' as DiffDecision]));
    const allTimes = new Map(result.diffs.map((d) => [d.id, now]));
    setDecisions(all);
    setDecidedAt(allTimes);
    setAcceptAllPending(false);
  }, [acceptAllPending, result.diffs]);

  const cancelAcceptAll = useCallback(() => setAcceptAllPending(false), []);

  const pendingCount  = useMemo(() => [...decisions.values()].filter((d) => d === 'pending').length,  [decisions]);
  const acceptedCount = useMemo(() => [...decisions.values()].filter((d) => d === 'accepted').length, [decisions]);
  const rejectedCount = useMemo(() => [...decisions.values()].filter((d) => d === 'rejected').length, [decisions]);

  // Live preview — applies accepted diffs to original text
  const previewText = useMemo(
    () => applyAcceptedDiffs(originalText, result.diffs, decisions),
    [originalText, result.diffs, decisions],
  );

  const auditTrail = useMemo(
    () => buildAuditTrail(result.sessionId, originalText, result.diffs, decisions, decidedAt),
    [result.sessionId, originalText, result.diffs, decisions, decidedAt],
  );

  const handleExportAudit = useCallback(() => {
    const blob = new Blob([JSON.stringify(auditTrail, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `vetassist-audit-${result.sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [auditTrail, result.sessionId]);

  return (
    <div style={editorShellStyle}>

      {/* Score summary row */}
      <div style={summaryRowStyle} aria-label={LABEL_SCORE}>
        <div style={scoreCircleStyle(result.overall)} aria-hidden="true">
          {result.overall}
        </div>
        <div style={scoreMetaStyle}>
          <span style={scoreLabelStyle}>{LABEL_SCORE}</span>
          <span style={scoreValueStyle}>{result.overall}%</span>
        </div>
        <div style={statsRowStyle} aria-label="Decision counts">
          <span style={statChipStyle('var(--va-color-text-secondary)')}>{pendingCount} {LABEL_PENDING}</span>
          <span style={statChipStyle('var(--va-color-score-high)')}>{acceptedCount} {LABEL_ACCEPTED}</span>
          <span style={statChipStyle('var(--va-color-border)')}>{rejectedCount} {LABEL_REJECTED}</span>
        </div>
      </div>

      {/* Accept All row — two-step confirmation */}
      {result.diffs.length > 0 && (
        <div style={acceptAllRowStyle}>
          {!acceptAllPending ? (
            <button type="button" style={acceptAllBtnStyle} onClick={handleAcceptAll}>
              {LABEL_ACCEPT_ALL}
            </button>
          ) : (
            <>
              <button type="button" style={acceptAllBtnStyle} onClick={handleAcceptAll} aria-live="polite">
                {LABEL_ACCEPT_ALL_CONFIRM}
              </button>
              <button type="button" style={cancelBtnStyle} onClick={cancelAcceptAll}>
                {LABEL_CANCEL}
              </button>
            </>
          )}
        </div>
      )}

      {/* Diff cards */}
      <div>
        <h2 style={panelHeadingStyle}>{HEADING_DIFF_PANEL}</h2>
        {result.diffs.length === 0 ? (
          <p style={{ fontFamily: 'var(--va-font-body)', color: 'var(--va-color-text-secondary)', fontStyle: 'italic' }}>
            {LABEL_NO_DIFFS}
          </p>
        ) : (
          <div style={diffListStyle} role="list" aria-label={ARIA_DIFF_LIST}>
            {result.diffs.map((diff) => (
              <div key={diff.id} role="listitem">
                <DiffCard
                  diff={diff}
                  decision={decisions.get(diff.id) ?? 'pending'}
                  onAccept={(id) => decide(id, 'accepted')}
                  onReject={(id) => decide(id, 'rejected')}
                  onUndo={undo}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live preview */}
      {acceptedCount > 0 && (
        <div>
          <h2 style={panelHeadingStyle}>{HEADING_PREVIEW}</h2>
          <pre style={previewBoxStyle} aria-label={ARIA_PREVIEW}>{previewText}</pre>
        </div>
      )}

      {/* Audit trail — only shown once decisions have been made */}
      {auditTrail.entries.length > 0 && (
        <div style={auditSectionStyle}>
          <h2 style={panelHeadingStyle}>{HEADING_AUDIT_TRAIL}</h2>
          <div role="list" aria-label={ARIA_AUDIT_LIST}>
            {auditTrail.entries.map((entry) => (
              <div key={entry.id} style={auditEntryStyle} role="listitem">
                <span>
                  <strong>{entry.decision.toUpperCase()}</strong>
                  {' — '}
                  {entry.rationale}
                </span>
                <span>
                  {entry.originalText
                    ? `"${truncate(entry.originalText, 60)}" → "${truncate(entry.suggestedText, 60)}"`
                    : '(insertion)'}
                </span>
                <span>{new Date(entry.decidedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <button type="button" style={exportBtnStyle} onClick={handleExportAudit}>
            {LABEL_EXPORT_AUDIT}
          </button>
        </div>
      )}

    </div>
  );
}
