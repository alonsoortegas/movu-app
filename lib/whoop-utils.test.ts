import { describe, expect, it } from 'vitest'
import { avg, shortDate, sleepHM, sportColor } from './whoop-utils'

describe('whoop formatting helpers', () => {
  it('maps known sports case-insensitively and falls back safely', () => {
    expect(sportColor('Running')).toBe('#8b5cf6')
    expect(sportColor('unknown sport')).toBe('#a78bfa')
    expect(sportColor(null)).toBe('#a78bfa')
  })

  it('averages positive values and ignores null/zero readings', () => {
    expect(avg([10, null, 20, 0])).toBe('15')
    expect(avg([10.2, 10.6], 1)).toBe('10.4')
    expect(avg([null, 0])).toBe('—')
  })

  it('formats dates and sleep duration compactly', () => {
    expect(shortDate('2026-07-17T12:00:00Z')).toBe('Jul 17')
    expect(sleepHM(7 * 3600000 + 32 * 60000)).toBe('7h 32m')
    expect(sleepHM(null)).toBe('—')
  })
})
