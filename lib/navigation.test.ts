import { describe, expect, it } from 'vitest'
import { getActiveNavigationIndex, positionFromPointer } from './navigation'

describe('getActiveNavigationIndex', () => {
  it.each([
    ['/dashboard', 0],
    ['/trends', 1],
    ['/registro', 2],
    ['/plan/week', 3],
    ['/perfil', 4],
  ])('maps %s to %i', (pathname, expected) => {
    expect(getActiveNavigationIndex(pathname)).toBe(expected)
  })

  it('falls back to Dashboard for an unknown route', () => {
    expect(getActiveNavigationIndex('/unknown')).toBe(0)
  })
})

describe('positionFromPointer', () => {
  it('clamps continuous drag positions to the dock', () => {
    expect(positionFromPointer(0, 0, 500, 5)).toBe(0)
    expect(positionFromPointer(250, 0, 500, 5)).toBeCloseTo(2)
    expect(positionFromPointer(700, 0, 500, 5)).toBe(4)
  })
})
