'use client';
// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-26
// Purpose: VA Terminology Glossary — alphabetical A-Z jump nav, search, CFR links

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import type { GlossaryTerm } from '../../lib/apiClient';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function GlossaryPage() {
  const [terms, setTerms]   = useState<GlossaryTerm[]>([]);
  const [query, setQuery]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const letterRefs          = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    void apiClient.getGlossary()
      .then(response => setTerms(response.terms as GlossaryTerm[]))
      .catch(() => setError('Failed to load glossary. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return terms;
    return terms.filter(g =>
      g.term.toLowerCase().includes(term) ||
      g.definition.toLowerCase().includes(term) ||
      g.acronym?.toLowerCase().includes(term),
    );
  }, [terms, query]);

  // Group filtered terms by first letter
  const grouped = useMemo(() => {
    const map: Record<string, GlossaryTerm[]> = {};
    for (const g of filtered) {
      const letter = g.term[0]?.toUpperCase() ?? '#';
      (map[letter] ??= []).push(g);
    }
    return map;
  }, [filtered]);

  const activeLetters = new Set(Object.keys(grouped));

  function scrollToLetter(letter: string) {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VA Terminology Glossary</h1>
        <p className="text-gray-600 mb-6">Plain-English definitions for VA jargon, acronyms, and regulations.</p>

        {/* Search */}
        <div className="mb-6">
          <label htmlFor="glossary-search" className="sr-only">Search VA terminology glossary</label>
          <input
            id="glossary-search"
            type="search"
            placeholder="Search terms, acronyms, or definitions…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search VA terminology glossary"
          />
        </div>

        {/* A–Z jump nav */}
        <nav
          aria-label="Glossary alphabetical navigation"
          className="sticky top-0 bg-gray-50 z-10 pb-3 overflow-x-auto"
        >
          <div className="flex gap-1 min-w-max">
            {ALPHABET.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                disabled={!activeLetters.has(letter)}
                className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                  activeLetters.has(letter)
                    ? 'bg-white border border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-400'
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                aria-label={`Jump to terms starting with ${letter}`}
              >
                {letter}
              </button>
            ))}
          </div>
        </nav>

        {/* Loading / error states */}
        {loading && <p className="text-gray-500 text-sm mt-6">Loading…</p>}
        {error   && <p className="text-red-600 text-sm mt-6">{error}</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-gray-500 text-sm mt-6">No terms match your search.</p>
        )}

        {/* Term groups */}
        <div className="mt-4 space-y-8">
          {ALPHABET.filter(l => activeLetters.has(l)).map(letter => (
            <section
              key={letter}
              ref={el => { letterRefs.current[letter] = el; }}
              aria-labelledby={`glossary-letter-${letter}`}
            >
              <h2
                id={`glossary-letter-${letter}`}
                className="text-xl font-bold text-blue-700 border-b border-blue-200 pb-1 mb-4"
              >
                {letter}
              </h2>

              <ul className="space-y-4" role="list">
                {(grouped[letter] ?? []).map(term => (
                  <li key={term.id} className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{term.term}</span>
                      {term.acronym && (
                        <span className="rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-xs text-gray-600 font-mono">
                          {term.acronym}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 leading-relaxed mb-2">{term.definition}</p>

                    <div className="flex flex-wrap items-center gap-3">
                      {term.cfrCitation && term.cfrLink && (
                        <a
                          href={term.cfrLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700 font-mono hover:bg-blue-100 transition-colors"
                          aria-label={`View ${term.cfrCitation} on eCFR (opens in new tab)`}
                        >
                          {term.cfrCitation} ↗
                        </a>
                      )}
                      {term.cfrCitation && !term.cfrLink && (
                        <span className="inline-block rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs text-blue-700 font-mono">
                          {term.cfrCitation}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
