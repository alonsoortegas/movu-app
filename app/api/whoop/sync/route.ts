import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidWhoopToken, whoopGet } from '@/lib/whoop/client'
import {
  normalizeWhoopWorkout,
  normalizeWhoopSleep,
  normalizeWhoopCycle,
  type WhoopWorkout,
  type WhoopSleep,
  type WhoopCycle,
} from '@/lib/whoop/normalize'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type SleepInsert = Database['public']['Tables']['sleep_logs']['Insert']
type MetricInsert = Database['public']['Tables']['daily_metrics']['Insert']

type WhoopRecovery = {
  cycle_id: number
  score: {
    recovery_score: number
    resting_heart_rate: number
    hrv_rmssd_milli: number
    spo2_percentage: number | null
    skin_temp_celsius: number | null
  } | null
}

async function fetchAllPages<T>(
  token: string,
  path: string,
  windowStart: string,
): Promise<T[]> {
  const records: T[] = []
  let cursor: string | null = null

  while (true) {
    const params = new URLSearchParams({ limit: '25', start: windowStart })
    if (cursor) params.set('nextToken', cursor)
    const data = await whoopGet(token, `${path}?${params}`) as { records?: T[]; next_token?: string }
    if (!data.records) {
      console.error(`[whoop/sync] unexpected response for ${path}:`, JSON.stringify(data).slice(0, 300))
      break
    }
    records.push(...data.records)
    if (!data.next_token) break
    cursor = data.next_token
  }

  return records
}

function toDateString(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined
  return d instanceof Date ? d.toISOString() : d
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const days = Math.min(Number(body.days ?? 90), 90)
  const windowStart = new Date(Date.now() - days * 86400000).toISOString()

  let token: string
  try {
    token = await getValidWhoopToken(user.id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'whoop_not_connected') return NextResponse.json({ error: msg }, { status: 400 })
    if (msg === 'whoop_reauth_required') return NextResponse.json({ error: msg }, { status: 401 })
    throw err
  }

  const admin = createAdminClient()

  let rawWorkouts: WhoopWorkout[], rawSleeps: WhoopSleep[], rawCycles: WhoopCycle[], rawRecoveries: WhoopRecovery[]
  try {
    ;[rawWorkouts, rawSleeps, rawCycles, rawRecoveries] = await Promise.all([
      fetchAllPages<WhoopWorkout>(token, '/activity/workout', windowStart),
      fetchAllPages<WhoopSleep>(token, '/activity/sleep', windowStart),
      fetchAllPages<WhoopCycle>(token, '/cycle', windowStart),
      fetchAllPages<WhoopRecovery>(token, '/recovery', windowStart),
    ])
  } catch (err) {
    console.error('[whoop/sync] WHOOP API fetch failed:', err)
    return NextResponse.json({ error: 'WHOOP API fetch failed', detail: String(err) }, { status: 500 })
  }

  // Workouts
  const workoutRows: ActivityInsert[] = rawWorkouts
    .map(w => normalizeWhoopWorkout(w, user.id))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r): ActivityInsert => ({
      user_id: r.user_id,
      whoop_activity_id: r.whoop_activity_id,
      source: r.source,
      activity_type: r.activity_type,
      activity_category: r.activity_category,
      activity_name: r.activity_name,
      start_date_utc: toDateString(r.start_date_utc),
      start_date_local: toDateString(r.start_date_local),
      timezone: r.timezone,
      elapsed_time_s: r.elapsed_time_s,
      moving_time_s: r.moving_time_s,
      distance_m: r.distance_m,
      avg_hr_bpm: r.avg_hr_bpm,
      max_hr_bpm: r.max_hr_bpm,
      strain: r.strain,
      calories_kcal: r.calories_kcal,
      hr_zones: r.hr_zones as ActivityInsert['hr_zones'],
      inferred_muscle_groups: r.inferred_muscle_groups,
      elevation_gain_m: r.elevation_gain_m,
      avg_pace_per_km_s: r.avg_pace_per_km_s,
      avg_cadence_spm: r.avg_cadence_spm,
      rpe: r.rpe,
      trainer: r.trainer,
    }))

  let activitiesCount = 0
  if (workoutRows.length > 0) {
    const { error } = await admin
      .from('activities')
      .upsert(workoutRows, { onConflict: 'whoop_activity_id', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    activitiesCount = workoutRows.length
  }

  // Sleep
  const sleepRows: SleepInsert[] = rawSleeps
    .map(s => normalizeWhoopSleep(s, user.id))
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r): SleepInsert => ({
      user_id: r.user_id,
      date: r.date,
      source: r.source,
      whoop_sleep_id: r.whoop_sleep_id,
      hours: r.hours,
      quality: r.quality,
      notes: r.notes,
      performance_pct: r.performance_pct,
      consistency_pct: r.consistency_pct,
      efficiency_pct: r.efficiency_pct,
      respiratory_rate: r.respiratory_rate,
      rem_hours: r.rem_hours,
      deep_hours: r.deep_hours,
      light_hours: r.light_hours,
      awake_hours: r.awake_hours,
      cycle_count: r.cycle_count,
      disturbance_count: r.disturbance_count,
      sleep_needed_baseline_h: r.sleep_needed_baseline_h,
      sleep_needed_debt_h: r.sleep_needed_debt_h,
      sleep_needed_strain_h: r.sleep_needed_strain_h,
    }))

  // Deduplicate by (user_id, date) — keep the record with the most hours if multiple per day
  const sleepByDate = new Map<string, typeof sleepRows[0]>()
  for (const row of sleepRows) {
    const key = `${row.user_id}:${row.date}`
    const existing = sleepByDate.get(key)
    if (!existing || (row.hours ?? 0) > (existing.hours ?? 0)) sleepByDate.set(key, row)
  }
  const dedupedSleepRows = [...sleepByDate.values()]

  let sleepCount = 0
  if (dedupedSleepRows.length > 0) {
    const { error } = await admin
      .from('sleep_logs')
      .upsert(dedupedSleepRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sleepCount = dedupedSleepRows.length
  }

  // Daily metrics: merge cycles + recoveries
  const cycleMap = new Map<number, WhoopCycle>()
  for (const cycle of rawCycles) cycleMap.set(cycle.id, cycle)

  const recoveryMap = new Map<number, WhoopRecovery>()
  for (const rec of rawRecoveries) recoveryMap.set(rec.cycle_id, rec)

  const metricRows: MetricInsert[] = []
  for (const [cycleId, cycle] of cycleMap) {
    const base = normalizeWhoopCycle(cycle, user.id)
    if (!base) continue

    const rec = recoveryMap.get(cycleId)
    const merged: MetricInsert = {
      user_id: base.user_id,
      date: base.date,
      source: base.source,
      whoop_cycle_id: base.whoop_cycle_id,
      daily_strain: base.daily_strain,
      total_calories_kcal: base.total_calories_kcal,
      daily_avg_hr: base.daily_avg_hr,
      daily_max_hr: base.daily_max_hr,
      active_min: base.active_min,
      recovery_score: rec?.score?.recovery_score ?? null,
      hrv_ms: rec?.score?.hrv_rmssd_milli ?? null,
      resting_hr_bpm: rec?.score?.resting_heart_rate ?? null,
      spo2_pct: rec?.score?.spo2_percentage ?? null,
      skin_temp_c: rec?.score?.skin_temp_celsius ?? null,
    }
    metricRows.push(merged)
  }

  const metricsByDate = new Map<string, typeof metricRows[0]>()
  for (const row of metricRows) {
    metricsByDate.set(`${row.user_id}:${row.date}`, row)
  }
  const dedupedMetricRows = [...metricsByDate.values()]

  let metricsCount = 0
  if (dedupedMetricRows.length > 0) {
    const { error } = await admin
      .from('daily_metrics')
      .upsert(dedupedMetricRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    metricsCount = dedupedMetricRows.length
  }

  return NextResponse.json({
    synced: {
      activities: activitiesCount,
      sleep: sleepCount,
      daily_metrics: metricsCount,
    },
  })
}
