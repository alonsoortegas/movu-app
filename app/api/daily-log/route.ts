import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type SleepLogInsert = Database['public']['Tables']['sleep_logs']['Insert']
type DailyMetricInsert = Database['public']['Tables']['daily_metrics']['Insert']

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function getDateValue(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  return new Date().toISOString().split('T')[0]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, sleep_hours, steps, is_on_period } = body

  if (!hasValue(sleep_hours) && !hasValue(steps) && !hasValue(is_on_period)) {
    return NextResponse.json({ error: 'sleep_hours, steps, or period status are required' }, { status: 400 })
  }

  const logDate = getDateValue(date)
  const writes: PromiseLike<unknown>[] = []

  if (hasValue(is_on_period)) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('sex')
      .eq('id', user.id)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (profile?.sex !== 'female') {
      return NextResponse.json({ error: 'period status is only available for female profiles' }, { status: 400 })
    }
  }

  if (hasValue(sleep_hours)) {
    const hours = Number(sleep_hours)
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      return NextResponse.json({ error: 'sleep_hours must be between 0 and 24' }, { status: 400 })
    }

    const sleepRow: SleepLogInsert = {
      user_id: user.id,
      date: logDate,
      hours,
    }
    writes.push(
      supabase
        .from('sleep_logs')
        .upsert(sleepRow, { onConflict: 'user_id,date' })
        .throwOnError()
    )
  }

  if (hasValue(steps) || hasValue(is_on_period)) {
    const stepsCount = Number(steps)
    if (hasValue(steps) && (!Number.isFinite(stepsCount) || stepsCount < 0)) {
      return NextResponse.json({ error: 'steps must be a positive number' }, { status: 400 })
    }
    if (hasValue(is_on_period) && typeof is_on_period !== 'boolean') {
      return NextResponse.json({ error: 'is_on_period must be true or false' }, { status: 400 })
    }

    const metricRow: DailyMetricInsert = {
      user_id: user.id,
      date: logDate,
    }
    if (hasValue(steps)) metricRow.steps_count = Math.round(stepsCount)
    if (hasValue(is_on_period)) metricRow.is_on_period = is_on_period

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
    const message = err instanceof Error ? err.message : 'Failed to save daily log'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
