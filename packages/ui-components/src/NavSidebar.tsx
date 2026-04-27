// NavSidebar.tsx
// Developer: Marcus Daley
// Date: 2026-04-20
// Purpose: Primary navigation sidebar — Field Black background, military stencil typography,
//          Old Glory Red left-border on active state, American flag watermark at 3% opacity.

import React, { useId } from 'react';

interface NavItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  // Count shown as a badge — 0 hides the badge
  readonly badgeCount?: number;
  readonly icon?: string;
}

interface NavSection {
  readonly label: string;
  readonly items: NavItem[];
}

interface NavSidebarProps {
  readonly sections: NavSection[];
  readonly activeItemId: string;
  readonly onNavigate?: (item: NavItem) => void;
  // Collapsed = icon-only 64px mode (desktop only)
  readonly collapsed?: boolean;
}

const sidebarStyle: React.CSSProperties = {
  backgroundColor: 'var(--va-color-field-black)',
  borderRight: '1px solid var(--va-color-aged-canvas)',
  display: 'flex',
  flexDirection: 'column',
  width: 'var(--va-sidebar-width)',
  minHeight: '100vh',
  position: 'sticky',
  top: '48px', // below CrisisLineBanner
  height: 'calc(100vh - 48px)',
  overflowY: 'auto',
  overflowX: 'hidden',
};

const logoAreaStyle: React.CSSProperties = {
  height: '64px',
  padding: '0 16px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  borderBottom: '1px solid var(--va-color-border)',
  flexShrink: 0,
};

const logoStarStyle: React.CSSProperties = {
  color: 'var(--va-color-old-glory-red)',
  fontSize: '20px',
  lineHeight: 1,
  userSelect: 'none',
};

const logoNameStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: '1rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--va-color-star-white)',
  lineHeight: 1.1,
};

const logoSubStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-body)',
  fontSize: '0.61rem',
  color: 'var(--va-color-text-secondary)',
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--va-font-heading)',
  fontSize: '0.56rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--va-color-border)',
  padding: '20px 16px 6px',
  userSelect: 'none',
};

const navItemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  fontFamily: 'var(--va-font-heading)',
  fontSize: 'var(--va-text-small)',
  fontWeight: 500,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: 'var(--va-color-text-secondary)',
  textDecoration: 'none',
  borderLeft: '3px solid transparent',
  transition: `color var(--va-duration-fast), background var(--va-duration-fast), border-color var(--va-duration-fast)`,
  minHeight: 'var(--va-touch-target-min)',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  borderRight: 'none',
  borderTop: 'none',
  borderBottom: 'none',
  width: '100%',
  textAlign: 'left',
};

const navItemActiveStyle: React.CSSProperties = {
  color: 'var(--va-color-text-primary)',
  backgroundColor: 'var(--va-color-aged-canvas)',
  borderLeft: '3px solid var(--va-color-old-glory-red)',
};

const badgeStyle: React.CSSProperties = {
  marginLeft: 'auto',
  backgroundColor: 'var(--va-color-old-glory-red)',
  color: 'var(--va-color-crisis-text)',
  fontFamily: 'var(--va-font-heading)',
  fontSize: '0.56rem',
  fontWeight: 600,
  padding: '2px 6px',
  borderRadius: '2px',
  letterSpacing: '0.04em',
  flexShrink: 0,
};

// Flag watermark SVG — 3% opacity, atmosphere not advertisement
const FlagWatermark: React.FC = () => (
  <div
    style={{ padding: '16px', opacity: 0.03, pointerEvents: 'none', userSelect: 'none', marginTop: 'auto' }}
    aria-hidden="true"
  >
    <svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg">
      {/* 13 stripes */}
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} y={i * 20} width="200" height="10" fill="#B22234" />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} y={i * 20 + 10} width="200" height="10" fill="#FFFFFF" opacity="0.5" />
      ))}
      {/* Union canton */}
      <rect y="0" width="80" height="70" fill="#1A2744" />
      {/* Stars — 5 rows alternating 6/5 */}
      {[10, 24, 38, 52, 66].map((y, row) => (
        Array.from({ length: row % 2 === 0 ? 6 : 5 }, (_, col) => (
          <text
            key={col}
            x={row % 2 === 0 ? 6 + col * 13 : 13 + col * 13}
            y={y}
            fill="white"
            fontSize="10"
            opacity="0.8"
          >★</text>
        ))
      ))}
    </svg>
  </div>
);

export const NavSidebar = React.forwardRef<HTMLElement, NavSidebarProps>(
  ({ sections, activeItemId, onNavigate, collapsed = false }, ref) => {
    const navId = useId();

    // Collapsed mode: 64px icon-only strip — future enhancement
    const width = collapsed ? '64px' : 'var(--va-sidebar-width)';

    return (
      <nav
        ref={ref}
        id={navId}
        aria-label="Primary navigation"
        style={{ ...sidebarStyle, width }}
      >
        {/* Logo area */}
        <div style={logoAreaStyle}>
          <span style={logoStarStyle} aria-hidden="true">★</span>
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={logoNameStyle}>VetAssist</span>
              <span style={logoSubStyle}>Your AI Battle Buddy</span>
            </div>
          )}
        </div>

        {/* Nav sections */}
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div style={sectionLabelStyle} aria-hidden="true">
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const isActive = item.id === activeItemId;
              const itemStyle: React.CSSProperties = isActive
                ? { ...navItemBase, ...navItemActiveStyle }
                : navItemBase;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  style={itemStyle}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={
                    item.badgeCount
                      ? `${item.label} — ${item.badgeCount} item${item.badgeCount !== 1 ? 's' : ''} pending`
                      : item.label
                  }
                  onClick={e => {
                    if (onNavigate) {
                      e.preventDefault();
                      onNavigate(item);
                    }
                  }}
                >
                  {item.icon && (
                    <span aria-hidden="true" style={{ fontSize: '14px' }}>{item.icon}</span>
                  )}
                  {!collapsed && item.label}
                  {!collapsed && item.badgeCount && item.badgeCount > 0 && (
                    <span style={badgeStyle} aria-hidden="true">
                      {item.badgeCount}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        ))}

        {/* Flag watermark — felt, not seen */}
        <FlagWatermark />
      </nav>
    );
  }
);

NavSidebar.displayName = 'NavSidebar';
