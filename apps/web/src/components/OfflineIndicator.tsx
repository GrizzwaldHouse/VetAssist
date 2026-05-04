// OfflineIndicator.tsx
// Developer: Marcus Daley
// Date: 2026-04-30
// Purpose: Non-dismissable banner shown when the browser is offline.
//          Hidden when online. WCAG 2.1 AA compliant — role="status", aria-live="polite".

'use client';

import React from 'react';
import { useOfflineStatus } from '../hooks/useOfflineStatus.js';

const OFFLINE_MESSAGE = "You're offline. AI features unavailable. Educational content still accessible." as const;

// Color constants — VetAssist palette
const COLOR_OFFLINE_BG = '#1B2838' as const;
const COLOR_OFFLINE_BORDER = '#C9A94E' as const;
const COLOR_OFFLINE_TEXT = '#C9A94E' as const;

// Size constants
const BANNER_FONT_SIZE = '14px' as const;
const BANNER_PADDING = '10px 16px' as const;
const BANNER_FONT_WEIGHT = 600 as const;
const BANNER_Z_INDEX = 9990 as const;
const BORDER_WIDTH = '2px' as const;

// Positioning constants — sticky keeps the banner visible as the user scrolls
const BANNER_POSITION = 'sticky' as const;
const BANNER_TOP = '0px' as const;

// Banner uses inline styles to avoid Tailwind purge issues in the public dir
// Colors match the VetAssist palette: COLOR_OFFLINE_BG background, COLOR_OFFLINE_TEXT text
const bannerStyle: React.CSSProperties = {
  backgroundColor: COLOR_OFFLINE_BG,
  borderBottom: `${BORDER_WIDTH} solid ${COLOR_OFFLINE_BORDER}`,
  color: COLOR_OFFLINE_TEXT,
  fontSize: BANNER_FONT_SIZE,
  fontWeight: BANNER_FONT_WEIGHT,
  padding: BANNER_PADDING,
  position: BANNER_POSITION,
  textAlign: 'center',
  top: BANNER_TOP,
  width: '100%',
  zIndex: BANNER_Z_INDEX,
};

export function OfflineIndicator() {
  const { isOnline } = useOfflineStatus();

  // Render nothing when online — no layout shift, no placeholder
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={bannerStyle}
    >
      {OFFLINE_MESSAGE}
    </div>
  );
}
