// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Claims Tracker page — create and manage VA disability claims with timeline, checklist, and deadlines

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CrisisLineBanner } from '@vetassist/ui-components/src/CrisisLineBanner.js';
import { apiClient } from '../../lib/apiClient.js';
import type {
  Claim,
  ClaimStatus,
  ClaimEvent,
  ClaimDeadline,
  ChecklistItem,
} from '../../lib/apiClient.js';
import { daysUntil, urgencyLevel } from '@vetassist/claims';
import type { UrgencyLevel } from '@vetassist/claims';

// ── Display text constants ─────────────────────────────────────────────────────

const PAGE_HEADING         = 'Claims Tracker';
const PAGE_SUBHEADING      = 'Track your VA disability claims from evidence gathering to decision — all in one place';
const NEW_CLAIM_LABEL      = 'New Claim';
const CREATE_LABEL         = 'Create Claim';
const CREATING_LABEL       = 'Creating…';
const CANCEL_LABEL         = 'Cancel';
const CONDITION_PLACEHOLDER = 'e.g. Tinnitus, PTSD, Knee injury…';
const CONDITION_LABEL      = 'Condition or Disability';
const EMPTY_STATE_TEXT     = 'No claims yet. Start by adding your first claim above.';
const VIEW_DETAILS_LABEL   = 'View Details';
const HIDE_DETAILS_LABEL   = 'Hide Details';
const TIMELINE_HEADING     = 'Timeline';
const CHECKLIST_HEADING    = 'Evidence Checklist';
const DEADLINES_HEADING    = 'Upcoming Deadlines';
const ADD_NOTE_LABEL       = 'Add Note';
const SUBMIT_NOTE_LABEL    = 'Save Note';
const NOTE_PLACEHOLDER     = 'Add a note to your claim timeline…';
const RATING_SUFFIX        = '% Rating';
const DAYS_SUFFIX          = ' days';
const OVERDUE_TEXT         = 'Overdue';
const TODAY_TEXT           = 'Due today';
const LOADING_TEXT         = 'Loading claims…';
const ERROR_PREFIX         = 'Failed to load claims: ';

// ── Status display map ─────────────────────────────────────────────────────────

const STATUS_LABELS: Readonly<Record<ClaimStatus, string>> = {
  not_started:        'Not Started',
  gathering_evidence: 'Gathering Evidence',
  submitted:          'Submitted',
  pending_decision:   'Pending Decision',
  rating_received:    'Rating Received',
  closed:             'Closed',
};

// Progress percentages — drive the progress bar width per status stage
const STATUS_PROGRESS: Readonly<Record<ClaimStatus, number>> = {
  not_started:        5,
  gathering_evidence: 20,
  submitted:          40,
  pending_decision:   60,
  rating_received:    90,
  closed:             100,
};

// Badge background colors — keyed to design tokens
const STATUS_COLORS: Readonly<Record<ClaimStatus, string>> = {
  not_started:        'var(--va-color-text-secondary)',
  gathering_evidence: 'var(--va-color-score-mid)',
  submitted:          'var(--va-color-old-glory-blue, #1a2744)',
  pending_decision:   'var(--va-color-score-mid)',
  rating_received:    'var(--va-color-score-high)',
  closed:             'var(--va-color-text-secondary)',
};

// Urgency level colors — match design token conventions
const URGENCY_COLORS: Readonly<Record<UrgencyLevel, string>> = {
  overdue:  'var(--va-color-old-glory-red)',
  critical: 'var(--va-color-old-glory-red)',
  soon:     'var(--va-color-score-mid)',
  ok:       'var(--va-color-score-high)',
};

// Event type icons — visual shorthand for each timeline event type
const EVENT_ICONS: Readonly<Record<string, string>> = {
  claim_created:           '★',
  evidence_added:          '◈',
  submitted_to_va:         '✈',
  c_and_p_exam_scheduled:  '◎',
  c_and_p_exam_completed:  '✓',
  decision_received:       '⊕',
  appeal_filed:            '⚑',
  note_added:              '✎',
};

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  maxWidth:      '800px',
  margin:        '0 auto',
  padding:       '24px var(--va-space-6)',
  gap:           '24px',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize:   'var(--va-text-heading-2)',
  color:      'var(--va-color-text-primary)',
  margin:     0,
};

const subheadingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize:   'var(--va-text-body)',
  color:      'var(--va-color-text-secondary)',
  margin:     0,
};

const newClaimButtonStyle: React.CSSProperties = {
  alignSelf:       'flex-start',
  height:          '44px',
  padding:         '0 24px',
  borderRadius:    'var(--va-radius-card)',
  border:          'none',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color:           '#fff',
  fontFamily:      'var(--va-font-heading)',
  fontSize:        'var(--va-text-small)',
  fontWeight:      600,
  letterSpacing:   '0.04em',
  textTransform:   'uppercase',
  cursor:          'pointer',
};

const formCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border:          '1px solid var(--va-color-border)',
  borderRadius:    'var(--va-radius-card)',
  padding:         '20px',
  display:         'flex',
  flexDirection:   'column',
  gap:             '16px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize:   'var(--va-text-small)',
  fontWeight: 600,
  color:      'var(--va-color-text-primary)',
};

const inputStyle: React.CSSProperties = {
  width:           '100%',
  height:          '44px',
  fontFamily:      'var(--va-font-body)',
  fontSize:        'var(--va-text-body)',
  color:           'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-background)',
  border:          '1px solid var(--va-color-border)',
  borderRadius:    'var(--va-radius-card)',
  padding:         '0 14px',
  boxSizing:       'border-box',
};

const formRowStyle: React.CSSProperties = {
  display: 'flex',
  gap:     '12px',
  flexWrap: 'wrap',
};

const primaryButtonStyle: React.CSSProperties = {
  height:          '44px',
  padding:         '0 24px',
  borderRadius:    'var(--va-radius-card)',
  border:          'none',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color:           '#fff',
  fontFamily:      'var(--va-font-heading)',
  fontSize:        'var(--va-text-small)',
  fontWeight:      600,
  letterSpacing:   '0.04em',
  textTransform:   'uppercase',
  cursor:          'pointer',
};

const primaryButtonDisabledStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  opacity: 0.4,
  cursor:  'not-allowed',
};

const secondaryButtonStyle: React.CSSProperties = {
  height:          '44px',
  padding:         '0 20px',
  borderRadius:    'var(--va-radius-card)',
  border:          '1px solid var(--va-color-border)',
  backgroundColor: 'transparent',
  color:           'var(--va-color-text-primary)',
  fontFamily:      'var(--va-font-body)',
  fontSize:        'var(--va-text-small)',
  cursor:          'pointer',
};

const claimsGridStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '16px',
};

const claimCardStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-aged-canvas)',
  border:          '1px solid var(--va-color-border)',
  borderRadius:    'var(--va-radius-card)',
  padding:         '20px',
  display:         'flex',
  flexDirection:   'column',
  gap:             '12px',
};

const claimHeaderStyle: React.CSSProperties = {
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  gap:            '12px',
  flexWrap:       'wrap',
};

const conditionStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize:   'var(--va-text-heading-3)',
  color:      'var(--va-color-text-primary)',
  margin:     0,
};

const badgeStyle = (status: ClaimStatus): React.CSSProperties => ({
  display:         'inline-block',
  padding:         '3px 10px',
  borderRadius:    '12px',
  fontSize:        'var(--va-text-caption)',
  fontFamily:      'var(--va-font-mono)',
  fontWeight:      600,
  color:           '#fff',
  backgroundColor: STATUS_COLORS[status],
  textTransform:   'uppercase',
  letterSpacing:   '0.04em',
  whiteSpace:      'nowrap',
});

const progressBarTrackStyle: React.CSSProperties = {
  height:          '6px',
  backgroundColor: 'var(--va-color-border)',
  borderRadius:    '3px',
  overflow:        'hidden',
};

const progressBarFillStyle = (pct: number): React.CSSProperties => ({
  height:          '100%',
  width:           `${pct}%`,
  backgroundColor: 'var(--va-color-old-glory-blue, #1a2744)',
  borderRadius:    '3px',
  transition:      'width 0.3s ease',
});

const ratingStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize:   'var(--va-text-heading-3)',
  color:      'var(--va-color-score-high)',
};

const deadlineRowStyle: React.CSSProperties = {
  display:   'flex',
  gap:       '8px',
  flexWrap:  'wrap',
};

const deadlineChipStyle = (urgency: UrgencyLevel): React.CSSProperties => ({
  display:         'inline-flex',
  alignItems:      'center',
  gap:             '4px',
  padding:         '3px 10px',
  borderRadius:    '12px',
  fontSize:        'var(--va-text-caption)',
  fontFamily:      'var(--va-font-body)',
  fontWeight:      600,
  color:           URGENCY_COLORS[urgency],
  border:          `1px solid ${URGENCY_COLORS[urgency]}`,
  backgroundColor: 'transparent',
});

const cardActionsStyle: React.CSSProperties = {
  display:    'flex',
  gap:        '8px',
  alignItems: 'center',
};

const detailsViewStyle: React.CSSProperties = {
  borderTop:  '1px solid var(--va-color-border)',
  paddingTop: '16px',
  display:    'flex',
  flexDirection: 'column',
  gap:        '20px',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily:    'var(--va-font-heading)',
  fontSize:      'var(--va-text-heading-3)',
  color:         'var(--va-color-text-primary)',
  margin:        '0 0 10px',
  letterSpacing: '0.02em',
};

const timelineListStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '8px',
  listStyle:     'none',
  margin:        0,
  padding:       0,
};

const timelineItemStyle: React.CSSProperties = {
  display:         'flex',
  gap:             '12px',
  padding:         '10px',
  backgroundColor: 'var(--va-color-background)',
  border:          '1px solid var(--va-color-border)',
  borderRadius:    'var(--va-radius-card)',
};

const timelineIconStyle: React.CSSProperties = {
  fontSize:          '18px',
  lineHeight:        1,
  flexShrink:        0,
  color:             'var(--va-color-text-secondary)',
  width:             '24px',
  textAlign:         'center',
};

const timelineContentStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '2px',
  flex:          1,
};

const timelineTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize:   'var(--va-text-small)',
  fontWeight: 600,
  color:      'var(--va-color-text-primary)',
};

const timelineDescStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize:   'var(--va-text-caption)',
  color:      'var(--va-color-text-secondary)',
  lineHeight: 1.4,
};

const timelineDateStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize:   'var(--va-text-caption)',
  color:      'var(--va-color-text-secondary)',
};

const checklistListStyle: React.CSSProperties = {
  display:       'flex',
  flexDirection: 'column',
  gap:           '6px',
  listStyle:     'none',
  margin:        0,
  padding:       0,
};

const checklistItemStyle: React.CSSProperties = {
  display:    'flex',
  alignItems: 'center',
  gap:        '10px',
  padding:    '8px 10px',
  backgroundColor: 'var(--va-color-background)',
  border:     '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  cursor:     'pointer',
};

const checklistLabelStyle = (completed: boolean): React.CSSProperties => ({
  fontFamily:      'var(--va-font-body)',
  fontSize:        'var(--va-text-small)',
  color:           completed ? 'var(--va-color-text-secondary)' : 'var(--va-color-text-primary)',
  textDecoration:  completed ? 'line-through' : 'none',
  flex:            1,
});

const noteTextareaStyle: React.CSSProperties = {
  width:           '100%',
  minHeight:       '80px',
  resize:          'vertical',
  fontFamily:      'var(--va-font-body)',
  fontSize:        'var(--va-text-body)',
  color:           'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-background)',
  border:          '1px solid var(--va-color-border)',
  borderRadius:    'var(--va-radius-card)',
  padding:         '10px 14px',
  boxSizing:       'border-box',
};

const emptyStateStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize:   'var(--va-text-body)',
  color:      'var(--va-color-text-secondary)',
  fontStyle:  'italic',
  textAlign:  'center',
  padding:    '40px 0',
};

const errorStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize:   'var(--va-text-small)',
  color:      'var(--va-color-old-glory-red)',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

// Formats an ISO string to a short human-readable date
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Deadline countdown chip — shows label + days remaining, color-coded by urgency
const DeadlineChip = React.memo(function DeadlineChip({ deadline }: { readonly deadline: ClaimDeadline }) {
  const days    = daysUntil(deadline.dueAt);
  const urgency = urgencyLevel(days);

  let daysText: string;
  if (days < 0)     daysText = OVERDUE_TEXT;
  else if (days === 0) daysText = TODAY_TEXT;
  else              daysText = `${days}${DAYS_SUFFIX}`;

  return (
    <span style={deadlineChipStyle(urgency)} title={`${deadline.label} — due ${formatDate(deadline.dueAt)}`}>
      {deadline.label}: {daysText}
    </span>
  );
});

// Single timeline event row with icon, title, description, and date
const TimelineEventItem = React.memo(function TimelineEventItem({ event }: { readonly event: ClaimEvent }) {
  const icon = EVENT_ICONS[event.type] ?? '•';

  return (
    <li style={timelineItemStyle}>
      <span style={timelineIconStyle} aria-hidden="true">{icon}</span>
      <div style={timelineContentStyle}>
        <span style={timelineTitleStyle}>{event.title}</span>
        <span style={timelineDescStyle}>{event.description}</span>
        <span style={timelineDateStyle}>{formatDate(event.occurredAt)}</span>
      </div>
    </li>
  );
});

// ClaimCard — renders a single claim with expandable detail view
const ClaimCard = React.memo(function ClaimCard({
  claim,
  isExpanded,
  onToggleExpand,
  onToggleChecklist,
  onAddNote,
}: {
  readonly claim: ClaimCard_Props['claim'];
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
  readonly onToggleChecklist: (itemId: string, completed: boolean) => Promise<void>;
  readonly onAddNote: (claimId: string, note: string) => Promise<void>;
}) {
  const [noteText, setNoteText] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [showNoteBox, setShowNoteBox] = useState(false);

  const progress = STATUS_PROGRESS[claim.status];

  const handleNoteSubmit = useCallback(async () => {
    const trimmed = noteText.trim();
    if (!trimmed || noteSubmitting) return;

    setNoteSubmitting(true);
    try {
      await onAddNote(claim.id, trimmed);
      setNoteText('');
      setShowNoteBox(false);
    } finally {
      setNoteSubmitting(false);
    }
  }, [claim.id, noteText, noteSubmitting, onAddNote]);

  return (
    <article style={claimCardStyle} aria-label={`Claim: ${claim.condition}`}>
      {/* Claim header — condition name + status badge */}
      <div style={claimHeaderStyle}>
        <h2 style={conditionStyle}>{claim.condition}</h2>
        <span style={badgeStyle(claim.status)} aria-label={`Status: ${STATUS_LABELS[claim.status]}`}>
          {STATUS_LABELS[claim.status]}
        </span>
      </div>

      {/* Progress bar — maps status to a visual percentage */}
      <div style={progressBarTrackStyle} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Claim progress">
        <div style={progressBarFillStyle(progress)} />
      </div>

      {/* Disability rating — only shown once set */}
      {claim.disabilityRating !== null && (
        <span style={ratingStyle} aria-label={`Disability rating: ${claim.disabilityRating}%`}>
          {claim.disabilityRating}{RATING_SUFFIX}
        </span>
      )}

      {/* Deadline countdown chips */}
      {claim.deadlines.length > 0 && (
        <div style={deadlineRowStyle} aria-label="Upcoming deadlines">
          {claim.deadlines.map((dl) => (
            <DeadlineChip key={dl.id} deadline={dl} />
          ))}
        </div>
      )}

      {/* Card actions */}
      <div style={cardActionsStyle}>
        <button
          type="button"
          style={secondaryButtonStyle}
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-controls={`claim-details-${claim.id}`}
        >
          {isExpanded ? HIDE_DETAILS_LABEL : VIEW_DETAILS_LABEL}
        </button>
      </div>

      {/* Expanded detail view — timeline + checklist + notes */}
      {isExpanded && (
        <div id={`claim-details-${claim.id}`} style={detailsViewStyle}>
          {/* Timeline section */}
          <section aria-label="Claim timeline">
            <h3 style={sectionHeadingStyle}>{TIMELINE_HEADING}</h3>
            {claim.timeline.length === 0 ? (
              <p style={{ ...emptyStateStyle, padding: '12px 0', fontSize: 'var(--va-text-caption)' }}>No events yet.</p>
            ) : (
              <ul style={timelineListStyle}>
                {claim.timeline.map((event) => (
                  <TimelineEventItem key={event.id} event={event} />
                ))}
              </ul>
            )}
          </section>

          {/* Checklist section */}
          <section aria-label="Evidence checklist">
            <h3 style={sectionHeadingStyle}>{CHECKLIST_HEADING}</h3>
            <ul style={checklistListStyle} role="list">
              {claim.checklist.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  claimId={claim.id}
                  onToggle={onToggleChecklist}
                />
              ))}
            </ul>
          </section>

          {/* Deadlines section — only if any exist */}
          {claim.deadlines.length > 0 && (
            <section aria-label="Deadlines">
              <h3 style={sectionHeadingStyle}>{DEADLINES_HEADING}</h3>
              <ul style={checklistListStyle} role="list">
                {claim.deadlines.map((dl) => (
                  <li key={dl.id} style={{ ...timelineItemStyle, flexDirection: 'column', gap: '4px' }}>
                    <span style={timelineTitleStyle}>{dl.label}</span>
                    <span style={timelineDateStyle}>Due: {formatDate(dl.dueAt)} — alert {dl.alertDaysBefore} days before</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Add note section */}
          <section aria-label="Add a note">
            {!showNoteBox ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => setShowNoteBox(true)}
              >
                {ADD_NOTE_LABEL}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={noteTextareaStyle}
                  placeholder={NOTE_PLACEHOLDER}
                  aria-label="Note text"
                  maxLength={2000}
                />
                <div style={formRowStyle}>
                  <button
                    type="button"
                    style={noteText.trim() && !noteSubmitting ? primaryButtonStyle : primaryButtonDisabledStyle}
                    onClick={() => void handleNoteSubmit()}
                    disabled={!noteText.trim() || noteSubmitting}
                  >
                    {noteSubmitting ? 'Saving…' : SUBMIT_NOTE_LABEL}
                  </button>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => { setShowNoteBox(false); setNoteText(''); }}
                  >
                    {CANCEL_LABEL}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  );
});

// Needed for TypeScript inference on the React.memo wrapper
interface ClaimCard_Props {
  readonly claim: Claim;
}

// Checklist row — checkbox controls toggle via PATCH API
const ChecklistRow = React.memo(function ChecklistRow({
  item,
  claimId,
  onToggle,
}: {
  readonly item: ChecklistItem;
  readonly claimId: string;
  readonly onToggle: (itemId: string, completed: boolean) => Promise<void>;
}) {
  const [toggling, setToggling] = useState(false);

  const handleChange = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      await onToggle(item.id, !item.completed);
    } finally {
      setToggling(false);
    }
  }, [item.id, item.completed, toggling, onToggle]);

  return (
    <li
      style={checklistItemStyle}
      onClick={() => void handleChange()}
      role="listitem"
      aria-label={`${item.completed ? 'Completed' : 'Incomplete'}: ${item.label}`}
    >
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => void handleChange()}
        disabled={toggling}
        aria-label={item.label}
        style={{ flexShrink: 0 }}
        id={`checklist-${claimId}-${item.id}`}
      />
      <label
        htmlFor={`checklist-${claimId}-${item.id}`}
        style={checklistLabelStyle(item.completed)}
      >
        {item.label}
      </label>
    </li>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TrackerPage() {
  const [claims, setClaims]             = useState<Claim[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showNewForm, setShowNewForm]   = useState(false);
  const [condition, setCondition]       = useState('');
  const [creating, setCreating]         = useState(false);
  // Tracks which claim cards have their detail view expanded — keyed by claim id
  const [expandedIds, setExpandedIds]   = useState<ReadonlySet<string>>(new Set());

  // Load claims on mount — MVP: no auth, returns all in-memory claims
  useEffect(() => {
    void (async () => {
      try {
        const data = await apiClient.listClaims();
        setClaims(data);
      } catch (err: unknown) {
        setError(`${ERROR_PREFIX}${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = condition.trim();
    if (!trimmed || creating) return;

    setCreating(true);
    try {
      const newClaim = await apiClient.createClaim({ condition: trimmed });
      setClaims((prev) => [newClaim, ...prev]);
      setCondition('');
      setShowNewForm(false);
    } catch (err: unknown) {
      setError(`Failed to create claim: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }, [condition, creating]);

  const toggleExpand = useCallback((claimId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) next.delete(claimId);
      else next.add(claimId);
      return next;
    });
  }, []);

  // Toggle a checklist item — optimistic update followed by API call
  const handleToggleChecklist = useCallback(async (claimId: string, itemId: string, completed: boolean) => {
    const updated = await apiClient.toggleChecklistItem(claimId, { itemId, completed });
    setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  // Add a note as a timeline event — posted to API then refreshes local state
  const handleAddNote = useCallback(async (claimId: string, note: string) => {
    const updated = await apiClient.addClaimEvent(claimId, {
      type:        'note_added',
      title:       'Note Added',
      description: note,
    });
    setClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  return (
    <div style={pageStyle}>
      {/* CrisisLineBanner always present per safety requirements */}
      <CrisisLineBanner />

      <div>
        <h1 style={headingStyle}>{PAGE_HEADING}</h1>
        <p style={subheadingStyle}>{PAGE_SUBHEADING}</p>
      </div>

      {/* New claim trigger — shows inline form on click */}
      {!showNewForm ? (
        <button
          type="button"
          style={newClaimButtonStyle}
          onClick={() => setShowNewForm(true)}
          aria-label="Open new claim form"
        >
          {NEW_CLAIM_LABEL}
        </button>
      ) : (
        <div style={formCardStyle} role="form" aria-label="New claim form">
          <label style={labelStyle} htmlFor="new-claim-condition">
            {CONDITION_LABEL}
          </label>
          <input
            id="new-claim-condition"
            type="text"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            style={inputStyle}
            placeholder={CONDITION_PLACEHOLDER}
            maxLength={500}
            aria-required="true"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
          />
          <div style={formRowStyle}>
            <button
              type="button"
              style={condition.trim() && !creating ? primaryButtonStyle : primaryButtonDisabledStyle}
              onClick={() => void handleCreate()}
              disabled={!condition.trim() || creating}
            >
              {creating ? CREATING_LABEL : CREATE_LABEL}
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => { setShowNewForm(false); setCondition(''); }}
            >
              {CANCEL_LABEL}
            </button>
          </div>
        </div>
      )}

      {error && <p style={errorStyle} role="alert">{error}</p>}

      {/* Claims list */}
      {isLoading ? (
        <p style={emptyStateStyle}>{LOADING_TEXT}</p>
      ) : claims.length === 0 ? (
        <p style={emptyStateStyle}>{EMPTY_STATE_TEXT}</p>
      ) : (
        <div style={claimsGridStyle} role="list" aria-label="Your claims">
          {claims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              isExpanded={expandedIds.has(claim.id)}
              onToggleExpand={() => toggleExpand(claim.id)}
              onToggleChecklist={(itemId, completed) => handleToggleChecklist(claim.id, itemId, completed)}
              onAddNote={handleAddNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
