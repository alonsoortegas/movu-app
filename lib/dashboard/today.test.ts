import { describe, expect, it } from 'vitest'
import { fuelTargetsForDayType, padLoadWeeks, resolveTodaySession } from './today'

const session = (day: string, title: string) => ({
  day_of_week: day,
  title,
  session_type: 'strength',
})

describe('resolveTodaySession', () => {
  it('returns the session matching today', () => {
    const sessions = [session('monday', 'Push'), session('wednesday', 'Pull')]
    const result = resolveTodaySession(sessions, 'wednesday')
    expect(result).toEqual({ kind: 'session', session: sessions[1] })
  })

  it('returns rest with the next session later this week', () => {
    const sessions = [session('monday', 'Push'), session('friday', 'Legs')]
    const result = resolveTodaySession(sessions, 'wednesday')
    expect(result).toEqual({ kind: 'rest', next: sessions[1], daysUntilNext: 2 })
  })

  it('wraps to next week when all sessions are past', () => {
    const sessions = [session('monday', 'Push'), session('tuesday', 'Pull')]
    const result = resolveTodaySession(sessions, 'saturday')
    expect(result).toEqual({ kind: 'rest', next: sessions[0], daysUntilNext: 2 })
  })

  it('returns rest with null next when there are no sessions', () => {
    expect(resolveTodaySession([], 'monday')).toEqual({ kind: 'rest', next: null, daysUntilNext: null })
  })
})

describe('padLoadWeeks', () => {
  it('pads to n Monday-keyed weeks, zero-filling gaps, marking the current week', () => {
    // 2026-07-18 is a Saturday; its ISO week starts 2026-07-13.
    const weeks = [
      { week: '2026-07-13', trainingMin: 120, lifestyleMin: 0, sessions: 3, strain: 0 },
      { week: '2026-06-29', trainingMin: 90, lifestyleMin: 10, sessions: 2, strain: 0 },
    ]
    const out = padLoadWeeks(weeks, '2026-07-18', 6)
    expect(out).toHaveLength(6)
    expect(out[0]).toEqual({ week: '2026-06-08', trainingMin: 0, sessions: 0, isCurrent: false })
    expect(out[3]).toEqual({ week: '2026-06-29', trainingMin: 90, sessions: 2, isCurrent: false })
    expect(out[5]).toEqual({ week: '2026-07-13', trainingMin: 120, sessions: 3, isCurrent: true })
  })
})

describe('fuelTargetsForDayType', () => {
  const row = (day_type: string) => ({
    day_type,
    calories_target: 2500,
    protein_target: 180,
    carbs_target: 250,
    fat_target: 80,
  })

  it('maps the matching day type to MacroTotals', () => {
    expect(fuelTargetsForDayType([row('rest'), row('hard')], 'hard')).toEqual({
      calories: 2500,
      protein_g: 180,
      carbs_g: 250,
      fat_g: 80,
    })
  })

  it('falls back to the first row when no day type matches', () => {
    expect(fuelTargetsForDayType([row('hard')], 'rest')).toEqual({
      calories: 2500,
      protein_g: 180,
      carbs_g: 250,
      fat_g: 80,
    })
  })

  it('returns null when there are no target rows', () => {
    expect(fuelTargetsForDayType([], 'moderate')).toBeNull()
  })
})
