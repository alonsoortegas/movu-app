import { describe, expect, it } from 'vitest'
import { isIsoCalendarDate, isValidPhaseRange } from './phases'

describe('phase date validation', () => {
  it('accepts real ISO calendar dates', () => {
    expect(isIsoCalendarDate('2028-02-29')).toBe(true)
  })

  it('rejects impossible or malformed dates', () => {
    expect(isIsoCalendarDate('2026-02-30')).toBe(false)
    expect(isIsoCalendarDate('17-07-2026')).toBe(false)
  })

  it('requires an optional end date to be on or after the start date', () => {
    expect(isValidPhaseRange('2026-07-01', null)).toBe(true)
    expect(isValidPhaseRange('2026-07-01', '2026-07-01')).toBe(true)
    expect(isValidPhaseRange('2026-07-02', '2026-07-01')).toBe(false)
  })
})
