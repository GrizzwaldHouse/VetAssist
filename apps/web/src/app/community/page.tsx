// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Community story feed — filter by category/branch, upvote, report, AI tips display

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AIDisclosureBanner, CrisisLineBanner } from '@vetassist/ui-components';
import { apiClient } from '../../lib/apiClient.js';
import type { CommunityStory, StoryCategory, StoryBranch } from '../../lib/apiClient.js';

// Display text constants
const PAGE_HEADING        = 'Veteran Stories';
const PAGE_SUBHEADING     = 'Real experiences from veterans who\'ve navigated the VA system. Learn from those who\'ve been there.';
const FILTER_ALL          = 'All';
const SUBMIT_BTN          = 'Share Your Story';
const UPVOTE_LABEL        = 'Helpful';
const REPORT_LABEL        = 'Report';
const TIPS_HEADING        = 'Actionable Tips from this Story';
const NO_STORIES          = 'No stories yet in this category. Be the first to share your experience.';
const LOADING_TEXT        = 'Loading stories…';
const REPORT_CONFIRM      = 'Thank you — our moderation team will review this content.';
const DISCLAIMER_PREFIX   = '⚠ ';

const CATEGORY_LABELS: Readonly<Record<StoryCategory | 'all', string>> = {
  all:                'All',
  cp_exam:            'C&P Exam',
  evidence:           'Evidence',
  appeals:            'Appeals',
  benefits_discovery: 'Benefits Discovery',
  transition:         'Transition',
  general:            'General',
};

const BRANCH_LABELS: Readonly<Record<StoryBranch | 'all', string>> = {
  all:            'All Branches',
  army:           'Army',
  navy:           'Navy',
  marines:        'Marines',
  air_force:      'Air Force',
  coast_guard:    'Coast Guard',
  space_force:    'Space Force',
  national_guard: 'National Guard',
  reserves:       'Reserves',
};

export default function CommunityPage() {
  const [stories, setStories]         = useState<CommunityStory[]>([]);
  const [loading, setLoading]         = useState(true);
  const [isCrisis, setIsCrisis]       = useState(false);
  const [category, setCategory]       = useState<StoryCategory | 'all'>('all');
  const [branch, setBranch]           = useState<StoryBranch | 'all'>('all');
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  const loadStories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.listStories(
        category === 'all' ? undefined : category,
        branch === 'all' ? undefined : branch,
      );
      setStories(data);
    } catch {
      setStories([]);
    } finally {
      setLoading(false);
    }
  }, [category, branch]);

  useEffect(() => { void loadStories(); }, [loadStories]);

  const handleUpvote = useCallback(async (id: string) => {
    try {
      const result = await apiClient.upvoteStory(id);
      setStories((prev) =>
        prev.map((s) => s.id === id ? { ...s, upvotes: result.upvotes } : s)
      );
    } catch { /* silent — upvote is non-critical */ }
  }, []);

  const handleReport = useCallback(async (id: string) => {
    try {
      await apiClient.reportStory(id);
      setReportedIds((prev) => new Set([...prev, id]));
    } catch { /* silent */ }
  }, []);

  return (
    <div style={PAGE_STYLE}>
      <AIDisclosureBanner />
      {isCrisis && <CrisisLineBanner />}

      <div style={HEADER_STYLE}>
        <div>
          <h1 style={H1_STYLE}>{PAGE_HEADING}</h1>
          <p style={SUBHEADING_STYLE}>{PAGE_SUBHEADING}</p>
        </div>
        <Link href="/community/submit" style={SUBMIT_BTN_STYLE}>{SUBMIT_BTN}</Link>
      </div>

      {/* Filter chips — category */}
      <div style={CHIPS_ROW_STYLE} role="group" aria-label="Filter by category">
        {(Object.keys(CATEGORY_LABELS) as (StoryCategory | 'all')[]).map((c) => (
          <button
            key={c}
            style={category === c ? CHIP_ACTIVE_STYLE : CHIP_STYLE}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Branch filter */}
      <div style={BRANCH_ROW_STYLE}>
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value as StoryBranch | 'all')}
          style={SELECT_STYLE}
          aria-label="Filter by branch"
        >
          {(Object.keys(BRANCH_LABELS) as (StoryBranch | 'all')[]).map((b) => (
            <option key={b} value={b}>{BRANCH_LABELS[b]}</option>
          ))}
        </select>
      </div>

      {/* Story feed */}
      {loading ? (
        <p style={LOADING_STYLE}>{LOADING_TEXT}</p>
      ) : stories.length === 0 ? (
        <p style={EMPTY_STYLE}>{NO_STORIES}</p>
      ) : (
        <div style={FEED_STYLE}>
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              reported={reportedIds.has(story.id)}
              onUpvote={() => void handleUpvote(story.id)}
              onReport={() => void handleReport(story.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── StoryCard ────────────────────────────────────────────────────────────────

interface StoryCardProps {
  readonly story: CommunityStory;
  readonly reported: boolean;
  readonly onUpvote: () => void;
  readonly onReport: () => void;
}

function StoryCard({ story, reported, onUpvote, onReport }: StoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article style={CARD_STYLE} aria-label={`Story: ${story.title}`}>
      <div style={CARD_HEADER_STYLE}>
        <span style={CATEGORY_BADGE_STYLE}>{CATEGORY_LABELS[story.category]}</span>
        {story.branch && <span style={BRANCH_BADGE_STYLE}>{BRANCH_LABELS[story.branch]}</span>}
        <span style={AUTHOR_STYLE}>{story.authorDisplay}</span>
      </div>

      <h2 style={CARD_TITLE_STYLE}>{story.title}</h2>

      <p style={CONTENT_STYLE}>
        {expanded ? story.content : `${story.content.slice(0, 280)}${story.content.length > 280 ? '…' : ''}`}
      </p>
      {story.content.length > 280 && (
        <button style={EXPAND_BTN_STYLE} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* AI-extracted tips */}
      {story.tips.length > 0 && (
        <div style={TIPS_SECTION_STYLE}>
          <h3 style={TIPS_HEADING_STYLE}>{TIPS_HEADING}</h3>
          <ul style={TIPS_LIST_STYLE}>
            {story.tips.map((tip) => (
              <li key={tip.id} style={TIP_ITEM_STYLE}>
                <span>{tip.text}</span>
                {tip.cfrCitation && <span style={CFR_STYLE}>{tip.cfrCitation}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={DISCLAIMER_STYLE}>{DISCLAIMER_PREFIX}{story.disclaimer}</p>

      <div style={CARD_FOOTER_STYLE}>
        <button style={UPVOTE_BTN_STYLE} onClick={onUpvote} aria-label={`${UPVOTE_LABEL} (${story.upvotes})`}>
          ▲ {UPVOTE_LABEL} ({story.upvotes})
        </button>
        {reported ? (
          <span style={REPORTED_STYLE}>{REPORT_CONFIRM}</span>
        ) : (
          <button style={REPORT_BTN_STYLE} onClick={onReport} aria-label={REPORT_LABEL}>{REPORT_LABEL}</button>
        )}
      </div>
    </article>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PAGE_STYLE: React.CSSProperties        = { maxWidth: 760, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 };
const HEADER_STYLE: React.CSSProperties      = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 };
const H1_STYLE: React.CSSProperties         = { fontSize: 28, fontWeight: 700, margin: 0 };
const SUBHEADING_STYLE: React.CSSProperties  = { fontSize: 15, color: '#555', margin: '4px 0 0' };
const SUBMIT_BTN_STYLE: React.CSSProperties  = { padding: '10px 20px', background: '#003366', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 };
const CHIPS_ROW_STYLE: React.CSSProperties   = { display: 'flex', flexWrap: 'wrap', gap: 8 };
const CHIP_STYLE: React.CSSProperties        = { padding: '6px 14px', border: '1px solid #ccc', borderRadius: 20, background: '#f5f5f5', cursor: 'pointer', fontSize: 13 };
const CHIP_ACTIVE_STYLE: React.CSSProperties = { ...CHIP_STYLE, background: '#003366', color: '#fff', borderColor: '#003366' };
const BRANCH_ROW_STYLE: React.CSSProperties  = { display: 'flex' };
const SELECT_STYLE: React.CSSProperties      = { padding: '7px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 };
const FEED_STYLE: React.CSSProperties        = { display: 'flex', flexDirection: 'column', gap: 20 };
const LOADING_STYLE: React.CSSProperties     = { color: '#666', fontStyle: 'italic' };
const EMPTY_STYLE: React.CSSProperties       = { color: '#666', fontStyle: 'italic', textAlign: 'center', padding: 40 };
const CARD_STYLE: React.CSSProperties        = { background: '#fff', border: '1px solid #e0e0e0', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 };
const CARD_HEADER_STYLE: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const CATEGORY_BADGE_STYLE: React.CSSProperties = { padding: '2px 10px', background: '#003366', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 600 };
const BRANCH_BADGE_STYLE: React.CSSProperties   = { padding: '2px 10px', background: '#6b8c42', color: '#fff', borderRadius: 12, fontSize: 11 };
const AUTHOR_STYLE: React.CSSProperties      = { fontSize: 12, color: '#888', marginLeft: 'auto' };
const CARD_TITLE_STYLE: React.CSSProperties  = { fontSize: 18, fontWeight: 700, margin: 0 };
const CONTENT_STYLE: React.CSSProperties     = { fontSize: 14, lineHeight: 1.65, color: '#333', margin: 0 };
const EXPAND_BTN_STYLE: React.CSSProperties  = { background: 'none', border: 'none', color: '#003366', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' };
const TIPS_SECTION_STYLE: React.CSSProperties = { background: '#f0f4f8', borderRadius: 8, padding: 14 };
const TIPS_HEADING_STYLE: React.CSSProperties  = { fontSize: 13, fontWeight: 700, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' };
const TIPS_LIST_STYLE: React.CSSProperties     = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 };
const TIP_ITEM_STYLE: React.CSSProperties      = { fontSize: 13, color: '#333', display: 'flex', flexDirection: 'column', gap: 2 };
const CFR_STYLE: React.CSSProperties           = { fontSize: 11, color: '#666', fontFamily: 'monospace' };
const DISCLAIMER_STYLE: React.CSSProperties    = { fontSize: 11, color: '#888', fontStyle: 'italic', borderTop: '1px solid #eee', paddingTop: 8 };
const CARD_FOOTER_STYLE: React.CSSProperties   = { display: 'flex', alignItems: 'center', gap: 16 };
const UPVOTE_BTN_STYLE: React.CSSProperties    = { padding: '6px 14px', background: '#f0f4f8', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const REPORT_BTN_STYLE: React.CSSProperties    = { background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' };
const REPORTED_STYLE: React.CSSProperties      = { fontSize: 12, color: '#666', fontStyle: 'italic' };
