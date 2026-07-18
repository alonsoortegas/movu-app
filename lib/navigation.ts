export const MOVU_NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard', icon: '⊞' },
  { key: 'plan', href: '/plan', icon: '☰' },
  { key: 'nutricion', href: '/nutricion', icon: '◇' },
  { key: 'trends', href: '/trends', icon: '⌁' },
  { key: 'perfil', href: '/perfil', icon: '◉' },
] as const

export const LIFEOS_DOCK_GEOMETRY = {
  radius: 28,
  itemMinHeight: 52,
  pillInset: 6,
  restScale: 1,
  dragScale: 1.06,
} as const

export function getActiveNavigationIndex(pathname: string): number {
  const index = MOVU_NAV_ITEMS.findIndex(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  )
  return index < 0 ? 0 : index
}

export function positionFromPointer(
  clientX: number,
  left: number,
  width: number,
  count: number,
): number {
  const padding = 6
  const segment = (width - padding * 2) / count
  const position = (clientX - left - padding) / segment - 0.5
  return Math.min(count - 1, Math.max(0, position))
}

export function nearestNavigationIndex(position: number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.round(position)))
}
