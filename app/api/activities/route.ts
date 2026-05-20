import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type SleepLogInsert = Database['public']['Tables']['sleep_logs']['Insert']
type DailyMetricInsert = Database['public']['Tables']['daily_metrics']['Insert']

const CATEGORY_MAP: Record<string, string> = {
  weightlifting: 'strength',
  cardio: 'other',
  running: 'run',
  cycling: 'ride',
  combined: 'hiit',
  bootcamp: 'hiit',
  'functional-fitness': 'strength',
  yoga: 'mobility',
  workshop: 'other',
  other: 'other',
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, className, studio, coachName, duration_min, calories, rpe, distance_km, sleep_hours, steps } = body

  if (!type || !duration_min) {
    return NextResponse.json({ error: 'type and duration_min are required' }, { status: 400 })
  }

  const row: ActivityInsert = {
    user_id: user.id,
    source: 'manual',
    activity_type: type,
    activity_category: CATEGORY_MAP[type] ?? 'other',
    activity_name: [className, studio].filter(Boolean).join(' · ') || null,
    coach_name: typeof coachName === 'string' && coachName.trim() ? coachName.trim() : null,
    moving_time_s: Number(duration_min) * 60,
    calories_kcal: calories ? Number(calories) : null,
    rpe: rpe ? Number(rpe) : null,
    start_date_utc: new Date().toISOString(),
  }

  if (distance_km !== undefined && distance_km !== null && distance_km !== '') {
    row.distance_m = Number(distance_km) * 1000
  }

  const { data: activity, error } = await supabase
    .from('activities')
    .insert(row)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date().toISOString().split('T')[0]
  const writes: PromiseLike<unknown>[] = []

  if (sleep_hours !== undefined && sleep_hours !== null && sleep_hours !== '') {
    const sleepRow: SleepLogInsert = {
      user_id: user.id,
      date: today,
      hours: Number(sleep_hours),
    }
    writes.push(
      supabase
        .from('sleep_logs')
        .upsert(sleepRow, { onConflict: 'user_id,date' })
        .throwOnError()
    )
  }

  if (steps !== undefined && steps !== null && steps !== '') {
    const metricRow: DailyMetricInsert = {
      user_id: user.id,
      date: today,
      steps_count: Number(steps),
    }
    writes.push(
      supabase
        .from('daily_metrics')
        .upsert(metricRow, { onConflict: 'user_id,date' })
        .throwOnError()
    )
  }

  try {
    await Promise.all(writes)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save daily metrics'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ activity }, { status: 201 })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const to = searchParams.get('to') ?? new Date().toISOString()
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const { data: activities, count } = await supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('start_date_utc', from)
    .lte('start_date_utc', to)
    .order('start_date_utc', { ascending: false })
    .range(offset, offset + limit - 1)

  // Aggregate HR zones across the period
  const zoneSummary = (activities ?? []).reduce(
    (acc, a) => {
      if (!a.hr_zones) return acc
      const z = a.hr_zones as Record<string, number>
      acc.z1_s += z.z1_s ?? (z.z1_min ?? 0) * 60
      acc.z2_s += z.z2_s ?? (z.z2_min ?? 0) * 60
      acc.z3_s += z.z3_s ?? (z.z3_min ?? 0) * 60
      acc.z4_s += z.z4_s ?? (z.z4_min ?? 0) * 60
      acc.z5_s += z.z5_s ?? (z.z5_min ?? 0) * 60
      acc.total_moving_time_s += a.moving_time_s ?? 0
      return acc
    },
    { z1_s: 0, z2_s: 0, z3_s: 0, z4_s: 0, z5_s: 0, total_moving_time_s: 0 }
  )

  return NextResponse.json({ activities, total: count, zone_summary: zoneSummary })
}
