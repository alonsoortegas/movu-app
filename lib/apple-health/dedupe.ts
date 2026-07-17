export type AppleHealthActivityKeyRow = {
  user_id?: string | null
  start_date_utc?: string | null
  activity_type?: string | null
}

export function dedupeAppleHealthActivityRows<T extends AppleHealthActivityKeyRow>(rows: T[]): T[] {
  const byNaturalKey = new Map<string, T>()
  const passthrough: T[] = []

  for (const row of rows) {
    if (!row.user_id || !row.start_date_utc || !row.activity_type) {
      passthrough.push(row)
      continue
    }

    byNaturalKey.set(`${row.user_id}\u0000${row.start_date_utc}\u0000${row.activity_type}`, row)
  }

  return [...passthrough, ...byNaturalKey.values()]
}
