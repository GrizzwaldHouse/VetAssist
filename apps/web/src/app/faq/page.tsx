'use client';
// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-26
// Purpose: FAQ page — searchable accordion list, category filters, VA workaround guide

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import type { FAQEntry, FAQCategory, VAWorkaround } from '../../lib/apiClient';

const CATEGORIES: { value: FAQCategory | 'all'; label: string }[] = [
  { value: 'all',         label: 'All' },
  { value: 'claims',      label: 'Claims' },
  { value: 'appeals',     label: 'Appeals' },
  { value: 'benefits',    label: 'Benefits' },
  { value: 'documents',   label: 'Documents' },
  { value: 'ratings',     label: 'Ratings' },
  { value: 'eligibility', label: 'Eligibility' },
  { value: 'va_website',  label: 'VA Website' },
  { value: 'general',     label: 'General' },
];

export default function FAQPage() {
  const [entries, setEntries]           = useState<FAQEntry[]>([]);
  const [workarounds, setWorkarounds]   = useState<VAWorkaround[]>([]);
  const [query, setQuery]               = useState('');
  const [category, setCategory]         = useState<FAQCategory | 'all'>('all');
  const [openId, setOpenId]             = useState<string | null>(null);
  const [workaroundsOpen, setWorkaroundsOpen] = useState(false);
  const [upvotes, setUpvotes]           = useState<Record<string, number>>({});
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      apiClient.getFAQ(1),
      apiClient.getWorkarounds(),
    ])
      .then(([faqResponse, workaroundList]) => {
        setEntries(faqResponse.entries as FAQEntry[]);
        setWorkarounds(workaroundList);
      })
      .catch(() => setError('Failed to load FAQ. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    return entries.filter(e => {
      const matchesCategory = category === 'all' || e.category === category;
      const matchesQuery    = !term ||
        e.question.toLowerCase().includes(term) ||
        e.answer.toLowerCase().includes(term);
      return matchesCategory && matchesQuery;
    });
  }, [entries, query, category]);

  function handleUpvote(id: string) {
    void apiClient.upvoteFAQ(id).then(result => {
      setUpvotes(prev => ({ ...prev, [id]: result.upvotes }));
    });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* AI disclosure — this page is manually curated, not AI-generated */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800 text-center">
        This content is manually curated by veterans and subject-matter experts — not AI-generated.
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-600 mb-8">Answers to the most common VA benefits questions. Search below or browse by topic.</p>

        {/* Search */}
        <div className="mb-4">
          <label htmlFor="faq-search" className="sr-only">Search frequently asked questions</label>
          <input
            id="faq-search"
            type="search"
            placeholder="Search questions and answers…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search frequently asked questions"
          />
        </div>

        {/* Category filter chips */}
        <nav aria-label="FAQ categories" className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                category === c.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
              aria-pressed={category === c.value}
            >
              {c.label}
            </button>
          ))}
        </nav>

        {/* FAQ list */}
        {loading && <p className="text-gray-500 text-sm">Loading…</p>}
        {error   && <p className="text-red-600 text-sm">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-500 text-sm">No results found. Try a different search term or category.</p>
        )}

        <ul className="space-y-3" role="list">
          {filtered.map(entry => (
            <li key={entry.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => setOpenId(openId === entry.id ? null : entry.id)}
                className="w-full text-left px-5 py-4 flex justify-between items-start gap-4"
                aria-expanded={openId === entry.id}
              >
                <span className="font-medium text-gray-900 text-sm leading-snug">{entry.question}</span>
                <span className="text-gray-400 mt-0.5 flex-shrink-0">{openId === entry.id ? '▲' : '▼'}</span>
              </button>

              {openId === entry.id && (
                <div className="px-5 pb-5">
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">{entry.answer}</p>

                  <div className="flex items-center gap-4">
                    {entry.relatedCFR && (
                      <span className="inline-block rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700 font-mono">
                        {entry.relatedCFR}
                      </span>
                    )}
                    <button
                      onClick={() => handleUpvote(entry.id)}
                      className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                      aria-label={`Upvote: ${entry.question}`}
                    >
                      ▲ Helpful ({upvotes[entry.id] ?? entry.upvotes})
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {/* VA Workaround Guide — collapsible section */}
        <section className="mt-12 bg-yellow-50 border border-yellow-200 rounded-lg" aria-label="VA Website Workaround Guide">
          <button
            onClick={() => setWorkaroundsOpen(o => !o)}
            className="w-full text-left px-5 py-4 flex justify-between items-center"
            aria-expanded={workaroundsOpen}
          >
            <div>
              <h2 className="font-semibold text-gray-900">VA Website Workaround Guide</h2>
              <p className="text-sm text-gray-600 mt-0.5">Known VA.gov issues and how to fix them</p>
            </div>
            <span className="text-gray-400">{workaroundsOpen ? '▲' : '▼'}</span>
          </button>

          {workaroundsOpen && (
            <ul className="px-5 pb-5 space-y-5" role="list">
              {workarounds.map(wa => (
                <li key={wa.id} className="border-t border-yellow-200 pt-4">
                  <p className="font-medium text-gray-900 text-sm mb-1">{wa.issue}</p>
                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">Symptom:</span> {wa.symptom}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Fix:</span> {wa.solution}
                  </p>
                  {wa.affectedPage && (
                    <p className="text-xs text-gray-400 mt-1">{wa.affectedPage}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
