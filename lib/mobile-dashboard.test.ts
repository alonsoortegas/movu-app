import { describe, expect, it } from 'vitest'
import { clampPercent, weeklyActivityProgress } from './mobile-dashboard'

describe('clampPercent', () => {
  it.each([[-20, 0], [0, 0], [58.9, 58.9], [120, 100]])(
    'maps %s to %s',
    (value, expected) => expect(clampPercent(value)).toBe(expected),
  )
})

describe('weeklyActivityProgress', () => {
  it('returns a bounded percentage with a positive target', () => {
    expect(weeklyActivityProgress(3, 5)).toBe(60)
    expect(weeklyActivityProgress(8, 5)).toBe(100)
  })

  it('returns null rather than inventing a target', () => {
    expect(weeklyActivityProgress(3)).toBeNull()
    expect(weeklyActivityProgress(3, 0)).toBeNull()
  })
})
