// Pure workout-plan logic ported from lifeos (WorkoutTab helpers + lib/workout.ts),
// generalized from hardcoded training blocks to per-user plan rows.

import { APP_TIMEZONE, dateKey } from '@/lib/trends/compute'

export const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayKey = (typeof DAY_ORDER)[number]

export const RPE_OPTIONS = [6, 7, 7.5, 8, 8.5, 9, 9.5, 10]

export function getTodayKey(reference = new Date(), timeZone = APP_TIMEZONE): DayKey {
  const localDate = dateKey(reference.toISOString(), timeZone)
  const day = new Date(`${localDate}T12:00:00Z`).getUTCDay()
  return DAY_ORDER[day === 0 ? 6 : day - 1] ?? 'monday'
}

export interface PlanWeekStatus {
  active: boolean
  week: number | null
  reason: 'not_started' | 'active' | 'expired'
}

// "Week N" of a plan, counted in the product's calendar timezone.
export function getPlanWeek(
  plan: { start_date: string; weeks: number },
  reference = new Date(),
  timeZone = APP_TIMEZONE,
): PlanWeekStatus {
  const startDay = Math.floor(Date.parse(`${plan.start_date}T00:00:00Z`) / 86400000)
  const today = dateKey(reference.toISOString(), timeZone)
  const todayDay = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000)
  const elapsedDays = todayDay - startDay
  if (elapsedDays < 0) return { active: false, week: null, reason: 'not_started' }
  const week = Math.floor(elapsedDays / 7) + 1
  if (week <= plan.weeks) return { active: true, week, reason: 'active' }
  return { active: false, week: null, reason: 'expired' }
}

// Normalise a weight string typed by the user — accept both "," and "." as decimal separator
export function parseWeightInput(raw: string): number | null {
  const normalized = raw.replace(',', '.')
  if (!normalized.trim()) return null
  const val = parseFloat(normalized)
  return Number.isFinite(val) && val >= 0 ? val : null
}

// Returns the upper bound of a prescribed_reps string ("4-5" → 5, "8/leg" → 8, "5" → 5)
export function parseTopReps(r: string | null): number | null {
  if (!r) return null
  const range = r.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return parseInt(range[2], 10)
  const single = r.match(/\d+/)
  return single ? parseInt(single[0], 10) : null
}

// Parse a prescribed_reps string to a numeric default (e.g. "4-5" → 4, "8/leg" → 8)
export function parseReps(r: string | null): number {
  if (!r) return 5
  const match = r.match(/\d+/)
  return match ? parseInt(match[0], 10) : 5
}

// Parse target_rpe to numeric default
export function parseRpe(r: string | null): number {
  if (!r) return 8
  const match = r.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 8
}

// If the last set hit or exceeded the top of the prescribed rep range, suggest +2.5kg
export function getProgressionSuggestion(
  prescribedReps: string | null,
  last: { weight_kg: number | null; reps: number | null } | undefined,
): number | null {
  if (!last?.weight_kg || last.weight_kg <= 0) return null
  const top = parseTopReps(prescribedReps)
  if (top === null) return null
  return (last.reps ?? 0) >= top ? last.weight_kg + 2.5 : null
}
