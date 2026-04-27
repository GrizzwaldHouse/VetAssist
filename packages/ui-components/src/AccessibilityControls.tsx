// AccessibilityControls.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Floating accessibility FAB + bottom-sheet panel.
//          Controls: font size (16-36px), dark/light mode, high contrast, read aloud, reduce motion.
//          Grandparent Test — every control must be operable by a 75-year-old first-time user.

import React, {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

interface AccessibilitySettings {
  readonly fontSize:       number;  // 16–36 in 2px steps
  readonly highContrast:   boolean;
  readonly reduceMotion:   boolean;
}

interface AccessibilityControlsProps {
  readonly onSettingsChange?: (settings: AccessibilitySettings) => void;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize:       18,
  highContrast:   false,
  reduceMotion:   false,
};

const FONT_MIN = 16;
const FONT_MAX = 36;
const FONT_STEP = 2;

// FAB — fixed bottom-right, 56px circle
const fabStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  backgroundColor: 'var(--va-color-aged-canvas)',
  border: '1px solid var(--va-color-border)',
  color: 'var(--va-color-star-white)',
  fontSize: '22px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 'var(--va-z-fab)' as unknown as number,
  transition: `border-color var(--va-duration-fast)`,
};

// Bottom sheet
const sheetOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 'calc(var(--va-z-fab) + 1)' as unknown as number,
  display: 'flex',
  alignItems: 'flex-end',
};

const sheetStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--va-color-aged-canvas)',
  borderTop: '3px solid var(--va-color-old-glory-red)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  borderRadius: 'var(--va-radius-card) var(--va-radius-card) 0 0',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-text-primary)',
};

const valueStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-mono)',
  fontSize: 'var(--va-text-small)',
  color: 'var(--va-color-text-secondary)',
  minWidth: '36px',
  textAlign: 'right',
};

const sliderStyle: React.CSSProperties = {
  flex: 1,
  accentColor: 'var(--va-color-old-glory-red)',
  height: '4px',
  cursor: 'pointer',
};

const toggleTrackBase: React.CSSProperties = {
  position: 'relative',
  width: '52px',
  height: '28px',
  borderRadius: '14px',
  cursor: 'pointer',
  transition: `background var(--va-duration-fast)`,
  flexShrink: 0,
};

const sheetTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-h4)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-star-white)',
  marginBottom: '4px',
};

const readAloudBtnStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  backgroundColor: 'var(--va-color-field-blue)',
  color: 'var(--va-color-text-primary)',
  border: '1px solid var(--va-color-border)',
  borderRadius: 'var(--va-radius-card)',
  height: '48px',
  width: '100%',
  cursor: 'pointer',
};

interface ToggleProps {
  readonly checked: boolean;
  readonly onChange: (v: boolean) => void;
  readonly label: string;
  readonly id: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, id }) => {
  const trackStyle: React.CSSProperties = {
    ...toggleTrackBase,
    backgroundColor: checked ? 'var(--va-color-old-glory-red)' : 'var(--va-color-border)',
  };
  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    top: '4px',
    left: checked ? '28px' : '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: checked ? 'var(--va-color-star-white)' : 'var(--va-color-text-secondary)',
    transition: `left var(--va-duration-fast), background var(--va-duration-fast)`,
  };
  return (
    <label htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      <div style={trackStyle} aria-hidden="true">
        <div style={thumbStyle} />
      </div>
      <span style={labelStyle}>{label}</span>
    </label>
  );
};

export const AccessibilityControls = React.forwardRef<HTMLButtonElement, AccessibilityControlsProps>(
  ({ onSettingsChange }, ref) => {
    const [isOpen, setIsOpen]       = useState(false);
    const [settings, setSettings]   = useState<AccessibilitySettings>(DEFAULT_SETTINGS);
    const firstFocusRef             = useRef<HTMLInputElement>(null);
    const panelId                   = useId();
    const fontSliderId              = useId();
    const highContrastId            = useId();
    const reduceMotionId            = useId();

    const update = useCallback(<K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K],
    ) => {
      setSettings(prev => {
        const next = { ...prev, [key]: value };
        onSettingsChange?.(next);
        return next;
      });
    }, [onSettingsChange]);

    // Apply font size to the root element so the whole app scales
    useEffect(() => {
      document.documentElement.style.fontSize = `${settings.fontSize}px`;
    }, [settings.fontSize]);

    // Apply high contrast class to root
    useEffect(() => {
      document.documentElement.classList.toggle('va-high-contrast', settings.highContrast);
    }, [settings.highContrast]);

    const handleOpen = useCallback(() => {
      setIsOpen(true);
    }, []);

    const handleClose = useCallback(() => setIsOpen(false), []);

    // Focus first control when sheet opens
    useEffect(() => {
      if (isOpen) firstFocusRef.current?.focus();
    }, [isOpen]);

    // Close on Escape
    const handleSheetKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    }, [handleClose]);

    const handleReadAloud = useCallback(() => {
      // Trigger Web Speech API read of main content
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const main = document.querySelector('main');
        if (main) {
          const utterance = new SpeechSynthesisUtterance(main.textContent ?? '');
          window.speechSynthesis.speak(utterance);
        }
      }
    }, []);

    return (
      <>
        {/* FAB */}
        <button
          ref={ref}
          style={fabStyle}
          onClick={handleOpen}
          aria-label="Accessibility options"
          aria-expanded={isOpen}
          aria-controls={panelId}
          // Extra hover style via onMouseEnter/Leave — CSS vars handle the color
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--va-color-old-glory-red)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--va-color-border)')}
        >
          ⓘ
        </button>

        {/* Bottom sheet */}
        {isOpen && (
          <div
            style={sheetOverlayStyle}
            onClick={handleClose}
            onKeyDown={handleSheetKeyDown}
            role="presentation"
          >
            <div
              id={panelId}
              style={sheetStyle}
              role="dialog"
              aria-label="Accessibility settings"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
            >
              <h2 style={sheetTitleStyle}>★ Accessibility Options</h2>

              {/* Font size */}
              <div>
                <div style={rowStyle}>
                  <label htmlFor={fontSliderId} style={labelStyle}>Text Size</label>
                  <span style={valueStyle} aria-live="polite">{settings.fontSize}px</span>
                </div>
                <input
                  id={fontSliderId}
                  ref={firstFocusRef}
                  type="range"
                  min={FONT_MIN}
                  max={FONT_MAX}
                  step={FONT_STEP}
                  value={settings.fontSize}
                  onChange={e => update('fontSize', parseInt(e.target.value, 10))}
                  style={sliderStyle}
                  aria-valuemin={FONT_MIN}
                  aria-valuemax={FONT_MAX}
                  aria-valuenow={settings.fontSize}
                  aria-valuetext={`${settings.fontSize} pixels`}
                />
              </div>

              {/* High contrast */}
              <Toggle
                id={highContrastId}
                checked={settings.highContrast}
                onChange={v => update('highContrast', v)}
                label="High Contrast Mode"
              />

              {/* Reduce motion */}
              <Toggle
                id={reduceMotionId}
                checked={settings.reduceMotion}
                onChange={v => update('reduceMotion', v)}
                label="Reduce Motion"
              />

              {/* Read aloud */}
              <button
                style={readAloudBtnStyle}
                onClick={handleReadAloud}
                aria-label="Read the current page content aloud"
              >
                ▶ Read Page Aloud
              </button>

              {/* Close */}
              <button
                style={{
                  ...readAloudBtnStyle,
                  backgroundColor: 'transparent',
                  borderColor: 'var(--va-color-border)',
                  color: 'var(--va-color-text-secondary)',
                }}
                onClick={handleClose}
                aria-label="Close accessibility panel"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }
);

AccessibilityControls.displayName = 'AccessibilityControls';
