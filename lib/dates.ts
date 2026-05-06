export function getISOWeekBounds() {
  const now = new Date()
  const day = now.getUTCDay() || 7
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - day + 1)
  monday.setUTCHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)
  return { weekStart: monday.toISOString(), weekEnd: sunday.toISOString() }
}
