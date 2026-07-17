const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function isValidPhaseRange(startDate: string, endDate: string | null): boolean {
  return isIsoCalendarDate(startDate) && (endDate == null || (isIsoCalendarDate(endDate) && endDate >= startDate))
}
