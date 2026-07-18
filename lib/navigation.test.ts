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
  it('exposes the five primary destinations in product order', () => {
    expect(MOVU_NAV_ITEMS.map(({ key, href }) => ({ key, href }))).toEqual([
      { key: 'dashboard', href: '/dashboard' },
      { key: 'plan', href: '/plan' },
      { key: 'nutricion', href: '/nutricion' },
      { key: 'trends', href: '/trends' },
      { key: 'perfil', href: '/perfil' },
    ])
  })

  it.each([
    ['/dashboard', 0],
    ['/dashboard/activity', 0],
    ['/plan', 1],
    ['/plan/week', 1],
    ['/nutricion', 2],
    ['/nutricion/catalogo', 2],
    ['/trends', 3],
    ['/trends/detail', 3],
    ['/perfil', 4],
    ['/perfil/settings', 4],
  ])('maps %s to %i', (pathname, expected) => {
    expect(getActiveNavigationIndex(pathname)).toBe(expected)
  })

  it.each(['/registro', '/unknown'])('falls back to Dashboard for non-primary route %s', (pathname) => {
    expect(getActiveNavigationIndex(pathname)).toBe(0)
  })
})

describe('positionFromPointer', () => {
  it('clamps continuous drag positions to the five-item dock', () => {
    expect(positionFromPointer(0, 0, 500, 5)).toBe(0)
    expect(positionFromPointer(250, 0, 500, 5)).toBeCloseTo(2)
    expect(positionFromPointer(600, 0, 500, 5)).toBe(4)
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
  it('rounds a continuous position and clamps it to five routes', () => {
    expect(nearestNavigationIndex(-2, 5)).toBe(0)
    expect(nearestNavigationIndex(2.6, 5)).toBe(3)
    expect(nearestNavigationIndex(20, 5)).toBe(4)
  })
})
