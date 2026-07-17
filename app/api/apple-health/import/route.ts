import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeWorkouts, normalizeSleep, normalizeDailyMetrics } from '@/lib/apple-health/normalize'
import { NextResponse } from 'next/server'
import type { HKWorkout, HKSleepRecord, HKDailyRecord } from '@/lib/apple-health/parser'
import type { Database } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type SleepInsert = Database['public']['Tables']['sleep_logs']['Insert']
type MetricInsert = Database['public']['Tables']['daily_metrics']['Insert']

interface ImportBody {
  workouts: HKWorkout[]
  sleepRecords: HKSleepRecord[]
  dailySummaries: Record<string, HKDailyRecord>
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: ImportBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })
  }

  const { workouts = [], sleepRecords = [], dailySummaries = {} } = body
  const dailySummariesMap = new Map(Object.entries(dailySummaries))

  const admin = createAdminClient()

  // ── Activities ───────────────────────────────────────────────────────────────
  const activityRows = normalizeWorkouts(workouts, user.id).map(r => ({
    ...r,
    start_date_utc: r.start_date_utc instanceof Date ? r.start_date_utc.toISOString() : r.start_date_utc,
    start_date_local: r.start_date_local instanceof Date ? r.start_date_local.toISOString() : r.start_date_local,
  })) as unknown as ActivityInsert[]
  let activitiesCount = 0

  if (activityRows.length > 0) {
    const dates = activityRows.map(r => r.start_date_utc as string)
    const minDate = dates.reduce((a, b) => (a < b ? a : b))
    const maxDate = dates.reduce((a, b) => (a > b ? a : b))

    const { error: delErr } = await admin
      .from('activities')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'apple_health')
      .gte('start_date_utc', minDate)
      .lte('start_date_utc', maxDate)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    const { error: insErr } = await admin.from('activities').insert(activityRows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    activitiesCount = activityRows.length
  }

  // ── Sleep ────────────────────────────────────────────────────────────────────
  const sleepRows = normalizeSleep(sleepRecords, user.id, dailySummariesMap) as unknown as SleepInsert[]
  let sleepCount = 0

  if (sleepRows.length > 0) {
    const { error } = await admin
      .from('sleep_logs')
      .upsert(sleepRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sleepCount = sleepRows.length
  }

  // ── Daily metrics ────────────────────────────────────────────────────────────
  const metricRows = normalizeDailyMetrics(dailySummariesMap, user.id) as unknown as MetricInsert[]
  let metricsCount = 0

  if (metricRows.length > 0) {
    const { error } = await admin
      .from('daily_metrics')
      .upsert(metricRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    metricsCount = metricRows.length
  }

  await admin
    .from('user_profiles')
    .update({ data_source: 'apple_health' })
    .eq('id', user.id)

  return NextResponse.json({
    synced: {
      activities: activitiesCount,
      sleep: sleepCount,
      daily_metrics: metricsCount,
    },
  })
}
