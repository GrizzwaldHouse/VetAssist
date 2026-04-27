// page.tsx
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Settings page — accessibility prefs, AI scoring mode, and about/legal disclaimer; persisted to localStorage

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AIDisclosureBanner } from '@vetassist/ui-components';

// localStorage key constant — no magic strings
const SETTINGS_STORAGE_KEY = 'vetassist_settings';

// Font size slider bounds and step
const FONT_SIZE_MIN  = 14;
const FONT_SIZE_MAX  = 24;
const FONT_SIZE_STEP = 2;

// Default settings values
const DEFAULT_FONT_SIZE     = 16;
const DEFAULT_DARK_MODE     = false;
const DEFAULT_HIGH_CONTRAST = false;
const DEFAULT_TTS           = false;
const DEFAULT_SCORING_MODE  = 'encouraging' as ScoringMode;

// Scoring mode type
type ScoringMode = 'encouraging' | 'strict';

interface VetAssistSettings {
  readonly fontSize:     number;
  readonly darkMode:     boolean;
  readonly highContrast: boolean;
  readonly tts:          boolean;
  readonly scoringMode:  ScoringMode;
}

const DEFAULT_SETTINGS: VetAssistSettings = {
  fontSize:     DEFAULT_FONT_SIZE,
  darkMode:     DEFAULT_DARK_MODE,
  highContrast: DEFAULT_HIGH_CONTRAST,
  tts:          DEFAULT_TTS,
  scoringMode:  DEFAULT_SCORING_MODE,
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: '640px',
  margin: '0 auto',
  padding: '32px var(--va-space-6)',
  display: 'flex',
  flexDirection: 'column',
  gap: '40px',
};

const pageTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-h2)',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-star-white)',
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--va-color-old-glory-red)',
  borderBottom: '1px solid var(--va-color-border)',
  paddingBottom: '8px',
  margin: 0,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  minWidth: '40px',
  textAlign: 'right',
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: 'var(--va-color-old-glory-red)',
  cursor: 'pointer',
};

// Toggle track — appearance driven by checked state in render
const buildToggleTrackStyle = (checked: boolean): React.CSSProperties => ({
  position: 'relative',
  width: '52px',
  height: '28px',
  borderRadius: '14px',
  backgroundColor: checked ? 'var(--va-color-old-glory-red)' : 'var(--va-color-border)',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background 200ms',
});

const buildToggleThumbStyle = (checked: boolean): React.CSSProperties => ({
  position: 'absolute',
  top: '4px',
  left: checked ? '28px' : '4px',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: 'var(--va-color-star-white)',
  transition: 'left 200ms',
});

const radioGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '24px',
};

const radioLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-primary)',
  cursor: 'pointer',
};

const aboutTextStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-body)',
  color: 'var(--va-color-text-secondary)',
  lineHeight: 1.7,
  margin: 0,
};

const disclaimerStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  fontStyle: 'italic',
  lineHeight: 1.6,
  margin: 0,
  borderLeft: '3px solid var(--va-color-old-glory-red)',
  paddingLeft: '12px',
};

// ─── Toggle Component ─────────────────────────────────────────────────────────

interface ToggleProps {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
  readonly onChange: (value: boolean) => void;
}

function SettingsToggle({ id, label, checked, onChange }: ToggleProps) {
  return (
    <div style={rowStyle}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      <label style={{ cursor: 'pointer' }} aria-hidden="true">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          aria-label={label}
        />
        <div style={buildToggleTrackStyle(checked)}>
          <div style={buildToggleThumbStyle(checked)} />
        </div>
      </label>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<VetAssistSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after mount — avoids SSR hydration mismatch
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<VetAssistSettings>;
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // localStorage unavailable or JSON malformed — fall back to defaults silently
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever settings change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // localStorage write failed — fail silently, no data loss risk here
    }
  }, [settings, hydrated]);

  const updateSetting = useCallback(<K extends keyof VetAssistSettings>(
    key: K,
    value: VetAssistSettings[K],
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Suppress rendering until hydrated to prevent checkbox flicker
  if (!hydrated) return null;

  return (
    <div style={pageStyle}>
      {/* AI disclosure — required because this page references AI scoring features */}
      <AIDisclosureBanner />

      <h1 style={pageTitleStyle}>Settings</h1>

      {/* ── Section 1: Accessibility ─────────────────────────────────────── */}
      <section aria-labelledby="section-accessibility" style={sectionStyle}>
        <h2 id="section-accessibility" style={sectionTitleStyle}>Accessibility</h2>

        {/* Font size slider */}
        <div>
          <div style={rowStyle}>
            <label htmlFor="font-size-slider" style={labelStyle}>
              Text Size
            </label>
            <span style={valueStyle} aria-live="polite">
              {settings.fontSize}px
            </span>
          </div>
          <input
            id="font-size-slider"
            type="range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={FONT_SIZE_STEP}
            value={settings.fontSize}
            onChange={e => updateSetting('fontSize', parseInt(e.target.value, 10))}
            style={sliderStyle}
            aria-valuemin={FONT_SIZE_MIN}
            aria-valuemax={FONT_SIZE_MAX}
            aria-valuenow={settings.fontSize}
            aria-valuetext={`${settings.fontSize} pixels`}
          />
        </div>

        <SettingsToggle
          id="dark-mode-toggle"
          label="Dark Mode"
          checked={settings.darkMode}
          onChange={v => updateSetting('darkMode', v)}
        />

        <SettingsToggle
          id="high-contrast-toggle"
          label="High Contrast"
          checked={settings.highContrast}
          onChange={v => updateSetting('highContrast', v)}
        />

        <SettingsToggle
          id="tts-toggle"
          label="Text-to-Speech (Read Aloud)"
          checked={settings.tts}
          onChange={v => updateSetting('tts', v)}
        />
      </section>

      {/* ── Section 2: AI Scoring Mode ──────────────────────────────────── */}
      <section aria-labelledby="section-scoring" style={sectionStyle}>
        <h2 id="section-scoring" style={sectionTitleStyle}>AI Scoring Mode</h2>

        <p style={labelStyle}>
          Controls how the AI evaluates your VA documents.
        </p>

        <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ ...labelStyle, marginBottom: '12px' }}>
            Choose scoring mode:
          </legend>
          <div style={radioGroupStyle}>
            {/* Encouraging mode — default */}
            <label style={radioLabelStyle}>
              <input
                type="radio"
                name="scoring-mode"
                value="encouraging"
                checked={settings.scoringMode === 'encouraging'}
                onChange={() => updateSetting('scoringMode', 'encouraging')}
                aria-label="Encouraging scoring mode — supportive feedback focused on strengths"
              />
              Encouraging
            </label>

            {/* Strict mode */}
            <label style={radioLabelStyle}>
              <input
                type="radio"
                name="scoring-mode"
                value="strict"
                checked={settings.scoringMode === 'strict'}
                onChange={() => updateSetting('scoringMode', 'strict')}
                aria-label="Strict scoring mode — detailed critical analysis"
              />
              Strict
            </label>
          </div>
        </fieldset>
      </section>

      {/* ── Section 3: About ────────────────────────────────────────────── */}
      <section aria-labelledby="section-about" style={sectionStyle}>
        <h2 id="section-about" style={sectionTitleStyle}>About VetAssist</h2>

        <p style={aboutTextStyle}>
          VetAssist is a free educational platform built for veterans. It helps you
          understand your VA benefits, improve the quality of your documents, and
          navigate the VA system with confidence.
        </p>

        <p style={aboutTextStyle}>
          We use AI to provide educational information about benefits, claims language,
          and VA regulations. Our goal is to empower veterans with knowledge — not to
          file claims on your behalf or guarantee outcomes.
        </p>

        <p style={disclaimerStyle}>
          VetAssist is an educational platform only. Nothing here constitutes legal or
          medical advice. For claim-specific guidance, connect with a VA-accredited
          Veterans Service Organization (VSO) representative at no cost. VetAssist
          operates under the VA Office of General Counsel 2004 Opinion on permitted
          educational activities.
        </p>
      </section>
    </div>
  );
}
