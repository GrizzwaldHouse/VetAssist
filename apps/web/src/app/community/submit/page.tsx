// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Story submission form — category, branch, content, author mode, PII warning

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CrisisLineBanner, PIIWarningModal } from '@vetassist/ui-components';
import { apiClient } from '../../../lib/apiClient.js';
import type { StoryCategory, StoryBranch } from '../../../lib/apiClient.js';

// Display text constants
const PAGE_HEADING     = 'Share Your Story';
const PAGE_SUBHEADING  = 'Your experience could help another veteran navigate the system. All submissions are reviewed before posting.';
const LABEL_TITLE      = 'Story Title';
const LABEL_CONTENT    = 'Your Story';
const LABEL_CATEGORY   = 'Category';
const LABEL_BRANCH     = 'Branch of Service';
const LABEL_AUTHOR     = 'How to display your name';
const LABEL_DISPLAY    = 'Display Name';
const PLACEHOLDER_TITLE   = 'e.g. How I won my C&P exam appeal';
const PLACEHOLDER_CONTENT = 'Share what happened, what worked, what you wish you\'d known…';
const PLACEHOLDER_DISPLAY = 'e.g. Army Veteran, 10 years service';
const BTN_SUBMIT       = 'Submit Story';
const BTN_SUBMITTING   = 'Submitting…';
const BTN_BACK         = '← Back to Stories';
const SUCCESS_MSG      = 'Your story has been submitted! It will appear in the feed after review.';
const CRISIS_MSG       = 'We noticed some concerning content in your submission. Please reach out to the Veterans Crisis Line: 988 (Press 1).';
const ERROR_MSG        = 'Submission failed. Please try again.';
const CONTENT_MIN_MSG  = 'Please write at least 50 characters.';
const PII_NOTICE       = 'Any sensitive information (SSNs, addresses) will be automatically redacted before your story is published.';

const CATEGORIES: { value: StoryCategory; label: string }[] = [
  { value: 'cp_exam',            label: 'C&P Exam' },
  { value: 'evidence',           label: 'Evidence' },
  { value: 'appeals',            label: 'Appeals' },
  { value: 'benefits_discovery', label: 'Benefits Discovery' },
  { value: 'transition',         label: 'Transition' },
  { value: 'general',            label: 'General' },
];

const BRANCHES: { value: StoryBranch; label: string }[] = [
  { value: 'army',           label: 'Army' },
  { value: 'navy',           label: 'Navy' },
  { value: 'marines',        label: 'Marines' },
  { value: 'air_force',      label: 'Air Force' },
  { value: 'coast_guard',    label: 'Coast Guard' },
  { value: 'space_force',    label: 'Space Force' },
  { value: 'national_guard', label: 'National Guard' },
  { value: 'reserves',       label: 'Reserves' },
];

export default function SubmitStoryPage() {
  const router = useRouter();
  const [title, setTitle]               = useState('');
  const [content, setContent]           = useState('');
  const [category, setCategory]         = useState<StoryCategory>('general');
  const [branch, setBranch]             = useState<StoryBranch | ''>('');
  const [authorMode, setAuthorMode]     = useState<'anonymous' | 'username'>('anonymous');
  const [authorDisplay, setAuthorDisplay] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [isCrisis, setIsCrisis]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [showPII, setShowPII]           = useState(false);

  const handleSubmit = useCallback(async () => {
    if (content.trim().length < 50) {
      setError(CONTENT_MIN_MSG);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.submitStory({
        title:         title.trim(),
        content:       content.trim(),
        category,
        branch:        branch === '' ? null : branch,
        tags:          [],
        authorMode,
        authorDisplay: authorMode === 'anonymous' ? 'Anonymous Veteran' : authorDisplay.trim() || 'Anonymous Veteran',
      });

      if (result.status === 'crisis') {
        setIsCrisis(true);
        return;
      }

      setSuccess(true);
    } catch {
      setError(ERROR_MSG);
    } finally {
      setSubmitting(false);
    }
  }, [title, content, category, branch, authorMode, authorDisplay]);

  if (success) {
    return (
      <div style={PAGE_STYLE}>
        <p style={SUCCESS_STYLE}>{SUCCESS_MSG}</p>
        <button style={BACK_BTN_STYLE} onClick={() => router.push('/community')}>{BTN_BACK}</button>
      </div>
    );
  }

  return (
    <div style={PAGE_STYLE}>
      {isCrisis && <CrisisLineBanner />}

      <div style={HEADER_STYLE}>
        <button style={BACK_LINK_STYLE} onClick={() => router.push('/community')}>{BTN_BACK}</button>
        <h1 style={H1_STYLE}>{PAGE_HEADING}</h1>
        <p style={SUBHEADING_STYLE}>{PAGE_SUBHEADING}</p>
      </div>

      <p style={PII_NOTICE_STYLE}>{PII_NOTICE}</p>

      <div style={FORM_STYLE}>
        <Field label={LABEL_TITLE}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={PLACEHOLDER_TITLE}
            maxLength={120}
            style={INPUT_STYLE}
            aria-label={LABEL_TITLE}
          />
        </Field>

        <Field label={LABEL_CATEGORY}>
          <select value={category} onChange={(e) => setCategory(e.target.value as StoryCategory)} style={INPUT_STYLE} aria-label={LABEL_CATEGORY}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label={LABEL_BRANCH}>
          <select value={branch} onChange={(e) => setBranch(e.target.value as StoryBranch | '')} style={INPUT_STYLE} aria-label={LABEL_BRANCH}>
            <option value="">Prefer not to say</option>
            {BRANCHES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </Field>

        <Field label={LABEL_CONTENT}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER_CONTENT}
            maxLength={10_000}
            rows={10}
            style={{ ...INPUT_STYLE, resize: 'vertical' }}
            aria-label={LABEL_CONTENT}
          />
          <span style={CHAR_COUNT_STYLE}>{content.length.toLocaleString()} / 10,000</span>
        </Field>

        <Field label={LABEL_AUTHOR}>
          <div style={RADIO_ROW_STYLE} role="radiogroup">
            <label style={RADIO_LABEL_STYLE}>
              <input type="radio" name="authorMode" value="anonymous" checked={authorMode === 'anonymous'} onChange={() => setAuthorMode('anonymous')} />
              {' '}Post anonymously
            </label>
            <label style={RADIO_LABEL_STYLE}>
              <input type="radio" name="authorMode" value="username" checked={authorMode === 'username'} onChange={() => setAuthorMode('username')} />
              {' '}Use a display name
            </label>
          </div>
          {authorMode === 'username' && (
            <input
              type="text"
              value={authorDisplay}
              onChange={(e) => setAuthorDisplay(e.target.value)}
              placeholder={PLACEHOLDER_DISPLAY}
              maxLength={50}
              style={{ ...INPUT_STYLE, marginTop: 8 }}
              aria-label={LABEL_DISPLAY}
            />
          )}
        </Field>

        {error && <p style={ERROR_STYLE} role="alert">{error}</p>}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitting || title.trim().length === 0 || content.trim().length < 50}
          style={submitting ? SUBMIT_DISABLED_STYLE : SUBMIT_BTN_STYLE}
          aria-label={BTN_SUBMIT}
        >
          {submitting ? BTN_SUBMITTING : BTN_SUBMIT}
        </button>
      </div>

      <PIIWarningModal isOpen={showPII} detectedType="PII" action="redacted" onDismiss={() => setShowPII(false)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={FIELD_STYLE}>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PAGE_STYLE: React.CSSProperties         = { maxWidth: 640, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 };
const HEADER_STYLE: React.CSSProperties       = { display: 'flex', flexDirection: 'column', gap: 6 };
const H1_STYLE: React.CSSProperties           = { fontSize: 26, fontWeight: 700, margin: 0 };
const SUBHEADING_STYLE: React.CSSProperties   = { fontSize: 14, color: '#555', margin: 0 };
const BACK_LINK_STYLE: React.CSSProperties    = { background: 'none', border: 'none', color: '#003366', cursor: 'pointer', fontSize: 14, textDecoration: 'underline', padding: 0, alignSelf: 'flex-start' };
const BACK_BTN_STYLE: React.CSSProperties     = { ...BACK_LINK_STYLE, fontSize: 15 };
const PII_NOTICE_STYLE: React.CSSProperties   = { fontSize: 12, color: '#666', background: '#f5f5f5', padding: '10px 14px', borderRadius: 6 };
const FORM_STYLE: React.CSSProperties         = { display: 'flex', flexDirection: 'column', gap: 18 };
const FIELD_STYLE: React.CSSProperties        = { display: 'flex', flexDirection: 'column', gap: 6 };
const LABEL_STYLE: React.CSSProperties        = { fontSize: 13, fontWeight: 600 };
const INPUT_STYLE: React.CSSProperties        = { padding: '9px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, width: '100%', boxSizing: 'border-box' };
const CHAR_COUNT_STYLE: React.CSSProperties   = { fontSize: 11, color: '#aaa', alignSelf: 'flex-end' };
const RADIO_ROW_STYLE: React.CSSProperties    = { display: 'flex', gap: 20 };
const RADIO_LABEL_STYLE: React.CSSProperties  = { fontSize: 14, cursor: 'pointer' };
const ERROR_STYLE: React.CSSProperties        = { color: '#c00', fontSize: 13 };
const SUCCESS_STYLE: React.CSSProperties      = { color: '#1a6b1a', fontWeight: 600, fontSize: 16 };
const SUBMIT_BTN_STYLE: React.CSSProperties   = { padding: '11px 24px', background: '#003366', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15, alignSelf: 'flex-start' };
const SUBMIT_DISABLED_STYLE: React.CSSProperties = { ...SUBMIT_BTN_STYLE, opacity: 0.5, cursor: 'not-allowed' };
