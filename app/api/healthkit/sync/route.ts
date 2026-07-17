import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { dedupeAppleHealthActivityRows } from '@/lib/apple-health/dedupe'
import { normalizeDailyMetrics, normalizeSleep, normalizeWorkouts } from '@/lib/apple-health/normalize'
import type { HKDailyRecord, HKSleepRecord, HKWorkout } from '@/lib/apple-health/parser'
import type { Database, Json } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type BodyMeasurementInsert = Database['public']['Tables']['body_measurements']['Insert']
type MetricInsert = Database['public']['Tables']['daily_metrics']['Insert']
type ProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
type SleepInsert = Database['public']['Tables']['sleep_logs']['Insert']

type WeightSample = {
  date: string
  weightKg: number
}

type HealthKitSyncBody = {
  workouts?: HKWorkout[]
  sleepRecords?: HKSleepRecord[]
  dailySummaries?: Record<string, HKDailyRecord>
  weightSamples?: WeightSample[]
  syncedThrough?: string
}

function toDateString(d: Date | string | null | undefined): string | undefined {
  if (!d) return undefined
  return d instanceof Date ? d.toISOString() : d
}

function serializeActivity(row: ReturnType<typeof normalizeWorkouts>[number]): ActivityInsert {
  return {
    user_id: row.user_id,
    source: row.source,
    activity_type: row.activity_type,
    activity_category: row.activity_category,
    activity_name: row.activity_name,
    start_date_utc: toDateString(row.start_date_utc),
    start_date_local: toDateString(row.start_date_local),
    timezone: row.timezone,
    moving_time_s: row.moving_time_s,
    elapsed_time_s: row.elapsed_time_s,
    distance_m: row.distance_m,
    elevation_gain_m: row.elevation_gain_m,
    avg_hr_bpm: row.avg_hr_bpm,
    max_hr_bpm: row.max_hr_bpm,
    avg_pace_per_km_s: row.avg_pace_per_km_s,
    avg_cadence_spm: row.avg_cadence_spm,
    strain: row.strain,
    calories_kcal: row.calories_kcal,
    inferred_muscle_groups: row.inferred_muscle_groups,
    hr_zones: row.hr_zones as ActivityInsert['hr_zones'],
    trainer: row.trainer,
    coach_name: row.coach_name,
    whoop_activity_id: row.whoop_activity_id,
  }
}

function isValidDateOnly(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('healthkit_last_sync_at, data_source')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    lastSyncAt: profile?.healthkit_last_sync_at ?? null,
    dataSource: profile?.data_source ?? null,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null) as HealthKitSyncBody | null
  if (!body) return NextResponse.json({ error: 'Expected JSON body' }, { status: 400 })

  const syncedThrough = typeof body.syncedThrough === 'string' && body.syncedThrough
    ? body.syncedThrough
    : new Date().toISOString()

  const workouts = Array.isArray(body.workouts) ? body.workouts : []
  const sleepRecords = Array.isArray(body.sleepRecords) ? body.sleepRecords : []
  const dailySummaries = body.dailySummaries && typeof body.dailySummaries === 'object'
    ? new Map(Object.entries(body.dailySummaries))
    : new Map<string, HKDailyRecord>()
  const weightSamples = Array.isArray(body.weightSamples) ? body.weightSamples : []

  const admin = createAdminClient()

  const activityRows = dedupeAppleHealthActivityRows(
    normalizeWorkouts(workouts, user.id).map(serializeActivity),
  )
  let activitiesCount = 0
  if (activityRows.length > 0) {
    const { data, error } = await admin.rpc('upsert_apple_health_activities', {
      p_rows: activityRows as unknown as Json,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    activitiesCount = data ?? activityRows.length
  }

  const sleepRows = normalizeSleep(sleepRecords, user.id, dailySummaries) as unknown as SleepInsert[]
  let sleepCount = 0
  if (sleepRows.length > 0) {
    const { error } = await admin
      .from('sleep_logs')
      .upsert(sleepRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sleepCount = sleepRows.length
  }

  const metricRows = normalizeDailyMetrics(dailySummaries, user.id) as unknown as MetricInsert[]
  let metricsCount = 0
  if (metricRows.length > 0) {
    const { error } = await admin
      .from('daily_metrics')
      .upsert(metricRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    metricsCount = metricRows.length
  }

  let weightCount = 0
  const validWeightSamples = weightSamples
    .filter((sample): sample is WeightSample => (
      typeof sample.date === 'string' &&
      isValidDateOnly(sample.date) &&
      typeof sample.weightKg === 'number' &&
      Number.isFinite(sample.weightKg)
    ))
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const sample of validWeightSamples) {
    const { data: existing, error: lookupError } = await admin
      .from('body_measurements')
      .select('id')
      .eq('user_id', user.id)
      .eq('measured_at', sample.date)
      .limit(1)
      .maybeSingle()
    if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
    if (existing) continue

    const row: BodyMeasurementInsert = {
      user_id: user.id,
      measured_at: sample.date,
      weight_kg: sample.weightKg,
      notes: 'Apple Health',
    }
    const { error: insertError } = await admin.from('body_measurements').insert(row)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    weightCount += 1
  }

  const { data: profile, error: profileReadError } = await admin
    .from('user_profiles')
    .select('data_source')
    .eq('id', user.id)
    .maybeSingle()
  if (profileReadError) return NextResponse.json({ error: profileReadError.message }, { status: 500 })

  const profileUpdate: ProfileUpdate = {
    healthkit_last_sync_at: syncedThrough,
  }
  const newestWeight = validWeightSamples.at(-1)
  if (newestWeight) profileUpdate.weight_kg = newestWeight.weightKg
  if (!profile?.data_source || profile.data_source === 'manual') {
    profileUpdate.data_source = 'apple_health'
  }

  const { error: profileUpdateError } = await admin
    .from('user_profiles')
    .update(profileUpdate)
    .eq('id', user.id)
  if (profileUpdateError) return NextResponse.json({ error: profileUpdateError.message }, { status: 500 })

  return NextResponse.json({
    synced: {
      activities: activitiesCount,
      sleep: sleepCount,
      daily_metrics: metricsCount,
      weight_samples: weightCount,
    },
    lastSyncAt: syncedThrough,
  })
}
