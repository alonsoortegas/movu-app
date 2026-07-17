export const SPORT_COLORS: Record<string, string> = {
  'functional fitness': '#f97316',
  'functional-fitness': '#f97316',
  yoga: '#10b981',
  running: '#8b5cf6',
  walking: '#6b7280',
  'weight lifting': '#06b6d4',
  weightlifting: '#06b6d4',
  lifting: '#06b6d4',
  cycling: '#3b82f6',
  hiit: '#f59e0b',
  "barry's": '#ef4444',
  barrys: '#ef4444',
  commuting: '#9ca3af',
  default: '#a78bfa',
}

export function sportColor(name: string | null): string {
  if (!name) return SPORT_COLORS.default
  return SPORT_COLORS[name.toLowerCase()] ?? SPORT_COLORS.default
}

export function avg(values: (number | null)[], decimals = 0): string {
  const usable = values.filter((value): value is number => value != null && value > 0)
  if (!usable.length) return '—'
  const mean = usable.reduce((sum, value) => sum + value, 0) / usable.length
  return decimals > 0 ? mean.toFixed(decimals) : String(Math.round(mean))
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function sleepHM(ms: number | null): string {
  if (!ms) return '—'
  const totalMinutes = Math.round(ms / 60000)
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
}
