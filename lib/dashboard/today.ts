// Pure derivations for the dashboard "today cockpit". Data fetching stays in
// the page; everything here is testable without Supabase.

import { DAY_ORDER, type DayKey } from '@/lib/workout/logic'
import { weekStartKey, type LoadWeek } from '@/lib/trends/compute'
import type { MacroTotals, NutritionDayType } from '@/lib/nutrition/macros'

export interface SessionLite {
  day_of_week: string
  title: string
  session_type: string
}

export type TodaySession<T extends SessionLite> =
  | { kind: 'session'; session: T }
  | { kind: 'rest'; next: T | null; daysUntilNext: number | null }

// Sessions belong to the current plan week; on a rest day the "next" session
// wraps forward as a preview hint (next week's line-up may differ).
export function resolveTodaySession<T extends SessionLite>(
  sessions: T[],
  todayKey: DayKey,
): TodaySession<T> {
  const match = sessions.find((s) => s.day_of_week === todayKey)
  if (match) return { kind: 'session', session: match }

  const todayIdx = DAY_ORDER.indexOf(todayKey)
  let next: T | null = null
  let best = Infinity
  for (const s of sessions) {
    const idx = DAY_ORDER.indexOf(s.day_of_week as DayKey)
    if (idx === -1) continue
    const delta = (idx - todayIdx + 7) % 7 || 7
    if (delta < best) {
      best = delta
      next = s
    }
  }
  return { kind: 'rest', next, daysUntilNext: next ? best : null }
}

export interface PaddedLoadWeek {
  week: string
  trainingMin: number
  sessions: number
  isCurrent: boolean
}

function addDays(key: string, days: number): string {
  return new Date(Date.parse(`${key}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10)
}

// computeLoadTrends only emits weeks that have data; the dashboard bar chart
// needs a fixed n-week window ending in the current week.
export function padLoadWeeks(weeks: LoadWeek[], todayKey: string, n: number): PaddedLoadWeek[] {
  const current = weekStartKey(todayKey)
  const byWeek = new Map(weeks.map((w) => [w.week, w]))
  const out: PaddedLoadWeek[] = []
  for (let i = n - 1; i >= 0; i--) {
    const week = addDays(current, -7 * i)
    const row = byWeek.get(week)
    out.push({
      week,
      trainingMin: row?.trainingMin ?? 0,
      sessions: row?.sessions ?? 0,
      isCurrent: i === 0,
    })
  }
  return out
}

export interface TargetRow {
  day_type: string
  calories_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
}

// Mirrors the target selection in components/nutrition/NutritionToday.tsx.
export function fuelTargetsForDayType(
  targets: TargetRow[],
  dayType: NutritionDayType,
): MacroTotals | null {
  const row = targets.find((t) => t.day_type === dayType) ?? targets[0]
  if (!row) return null
  return {
    calories: row.calories_target,
    protein_g: row.protein_target,
    carbs_g: row.carbs_target,
    fat_g: row.fat_target,
  }
}
