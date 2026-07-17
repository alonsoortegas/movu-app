import { describe, expect, it } from 'vitest'
import {
  getActiveNavigationIndex,
  nearestNavigationIndex,
  positionFromPointer,
} from './navigation'

describe('getActiveNavigationIndex', () => {
  it.each([
    ['/dashboard', 0],
    ['/dashboard/activity', 0],
    ['/trends', 1],
    ['/registro', 2],
    ['/plan', 3],
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

  it('places each segment center on its integer index', () => {
    const width = 500
    const inner = width - 12
    const segment = inner / 5

    for (let index = 0; index < 5; index += 1) {
      const clientX = 6 + segment * (index + 0.5)
      expect(positionFromPointer(clientX, 0, width, 5)).toBeCloseTo(index)
    }
  })
})

describe('nearestNavigationIndex', () => {
  it('rounds a continuous position and clamps it to valid routes', () => {
    expect(nearestNavigationIndex(-2, 5)).toBe(0)
    expect(nearestNavigationIndex(2.6, 5)).toBe(3)
    expect(nearestNavigationIndex(20, 5)).toBe(4)
  })
})
