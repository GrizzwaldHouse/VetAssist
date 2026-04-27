// DeadlineCalculator.ts
// Developer: Marcus Daley
// Date: 2026-04-21
// Purpose: Calculates days remaining to deadline and urgency level for display

// Days-remaining thresholds — drive color coding in the UI
const URGENCY_OVERDUE_MAX  = 0;   // negative = overdue
const URGENCY_CRITICAL_MAX = 7;   // 0–7 days: critical (red)
const URGENCY_SOON_MAX     = 30;  // 8–30 days: soon (amber)
// >30 days is 'ok' (green)

export type UrgencyLevel = 'overdue' | 'critical' | 'soon' | 'ok';

// Returns the number of whole days until the deadline — negative means overdue
export function daysUntil(dueAt: string): number {
  const MS_PER_DAY = 86_400_000;
  const now        = Date.now();
  const due        = new Date(dueAt).getTime();
  return Math.floor((due - now) / MS_PER_DAY);
}

// Maps a days-remaining count to a display urgency level
export function urgencyLevel(daysRemaining: number): UrgencyLevel {
  if (daysRemaining < URGENCY_OVERDUE_MAX)  return 'overdue';
  if (daysRemaining <= URGENCY_CRITICAL_MAX) return 'critical';
  if (daysRemaining <= URGENCY_SOON_MAX)     return 'soon';
  return 'ok';
}
