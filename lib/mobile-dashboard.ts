export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

export function weeklyActivityProgress(
  completed: number,
  target?: number | null,
): number | null {
  if (!target || target <= 0) return null
  return clampPercent((completed / target) * 100)
}
