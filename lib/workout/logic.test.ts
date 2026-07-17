import { describe, expect, it } from 'vitest'
import {
  DAY_ORDER,
  RPE_OPTIONS,
  getPlanWeek,
  getProgressionSuggestion,
  getTodayKey,
  parseReps,
  parseRpe,
  parseTopReps,
  parseWeightInput,
} from './logic'

describe('parseWeightInput', () => {
  it('accepts dot decimals', () => {
    expect(parseWeightInput('82.5')).toBe(82.5)
  })

  it('accepts comma decimals', () => {
    expect(parseWeightInput('82,5')).toBe(82.5)
  })

  it('accepts zero (bodyweight)', () => {
    expect(parseWeightInput('0')).toBe(0)
  })

  it('rejects negatives and garbage', () => {
    expect(parseWeightInput('-5')).toBeNull()
    expect(parseWeightInput('abc')).toBeNull()
    expect(parseWeightInput('')).toBeNull()
  })
})

describe('parseTopReps', () => {
  it('takes the upper bound of a range', () => {
    expect(parseTopReps('4-5')).toBe(5)
    expect(parseTopReps('8 - 12')).toBe(12)
  })

  it('takes the number from unilateral and free-form prescriptions', () => {
    expect(parseTopReps('8/leg')).toBe(8)
    expect(parseTopReps('25 unbroken')).toBe(25)
  })

  it('returns null without a number', () => {
    expect(parseTopReps(null)).toBeNull()
    expect(parseTopReps('max')).toBeNull()
  })
})

describe('parseReps / parseRpe defaults', () => {
  it('parses the first number with sensible defaults', () => {
    expect(parseReps('4-5')).toBe(4)
    expect(parseReps('8/leg')).toBe(8)
    expect(parseReps(null)).toBe(5)
    expect(parseRpe('8-8.5')).toBe(8)
    expect(parseRpe('7.5')).toBe(7.5)
    expect(parseRpe(null)).toBe(8)
  })
})

describe('getProgressionSuggestion', () => {
  it('suggests +2.5kg when the last set hit the top of the range', () => {
    expect(getProgressionSuggestion('4-5', { weight_kg: 95, reps: 5 })).toBe(97.5)
  })

  it('stays quiet below the top of the range', () => {
    expect(getProgressionSuggestion('4-5', { weight_kg: 95, reps: 4 })).toBeNull()
  })

  it('needs a positive logged weight and a parseable prescription', () => {
    expect(getProgressionSuggestion('4-5', { weight_kg: 0, reps: 5 })).toBeNull()
    expect(getProgressionSuggestion('4-5', undefined)).toBeNull()
    expect(getProgressionSuggestion(null, { weight_kg: 95, reps: 5 })).toBeNull()
  })
})

describe('getPlanWeek', () => {
  const plan = { start_date: '2026-06-29', weeks: 4 }

  it('reports not_started before the start date', () => {
    expect(getPlanWeek(plan, new Date('2026-06-28T12:00:00'))).toEqual({
      active: false,
      week: null,
      reason: 'not_started',
    })
  })

  it('computes the 1-based week while active', () => {
    expect(getPlanWeek(plan, new Date('2026-06-29T08:00:00')).week).toBe(1)
    expect(getPlanWeek(plan, new Date('2026-07-17T08:00:00')).week).toBe(3)
  })

  it('expires after the final week', () => {
    expect(getPlanWeek(plan, new Date('2026-07-27T08:00:00'))).toEqual({
      active: false,
      week: null,
      reason: 'expired',
    })
  })
})

describe('day helpers', () => {
  it('orders days monday-first', () => {
    expect(DAY_ORDER[0]).toBe('monday')
    expect(DAY_ORDER[6]).toBe('sunday')
  })

  it('maps JS Sunday to sunday', () => {
    expect(getTodayKey(new Date('2026-07-19T12:00:00'))).toBe('sunday') // a Sunday
    expect(getTodayKey(new Date('2026-07-17T12:00:00'))).toBe('friday')
  })

  it('exposes the RPE picker options', () => {
    expect(RPE_OPTIONS).toEqual([6, 7, 7.5, 8, 8.5, 9, 9.5, 10])
  })
})
