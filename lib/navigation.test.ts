import { describe, expect, it } from 'vitest'
import {
  getActiveNavigationIndex,
  LIFEOS_DOCK_GEOMETRY,
  MOVU_NAV_ITEMS,
  nearestNavigationIndex,
  positionFromPointer,
} from './navigation'

describe('LIFEOS_DOCK_GEOMETRY', () => {
  it('keeps the active material compact and inside the dock', () => {
    expect(LIFEOS_DOCK_GEOMETRY).toEqual({
      radius: 28,
      itemMinHeight: 52,
      pillInset: 6,
      restScale: 1,
      dragScale: 1.06,
    })
  })
})

describe('getActiveNavigationIndex', () => {
  it('exposes nutrition as the sixth primary destination', () => {
    expect(MOVU_NAV_ITEMS.map((item) => item.key)).toEqual([
      'dashboard',
      'trends',
      'registro',
      'plan',
      'nutricion',
      'perfil',
    ])
  })

  it.each([
    ['/dashboard', 0],
    ['/dashboard/activity', 0],
    ['/trends', 1],
    ['/registro', 2],
    ['/plan', 3],
    ['/plan/week', 3],
    ['/nutricion', 4],
    ['/nutricion/catalogo', 4],
    ['/perfil', 5],
  ])('maps %s to %i', (pathname, expected) => {
    expect(getActiveNavigationIndex(pathname)).toBe(expected)
  })

  it('falls back to Dashboard for an unknown route', () => {
    expect(getActiveNavigationIndex('/unknown')).toBe(0)
  })
})

describe('positionFromPointer', () => {
  it('clamps continuous drag positions to the dock', () => {
    expect(positionFromPointer(0, 0, 600, 6)).toBe(0)
    expect(positionFromPointer(300, 0, 600, 6)).toBeCloseTo(2.5)
    expect(positionFromPointer(700, 0, 600, 6)).toBe(5)
  })

  it('places each segment center on its integer index', () => {
    const width = 600
    const inner = width - 12
    const segment = inner / 6

    for (let index = 0; index < 6; index += 1) {
      const clientX = 6 + segment * (index + 0.5)
      expect(positionFromPointer(clientX, 0, width, 6)).toBeCloseTo(index)
    }
  })
})

describe('nearestNavigationIndex', () => {
  it('rounds a continuous position and clamps it to valid routes', () => {
    expect(nearestNavigationIndex(-2, 6)).toBe(0)
    expect(nearestNavigationIndex(2.6, 6)).toBe(3)
    expect(nearestNavigationIndex(20, 6)).toBe(5)
  })
})
