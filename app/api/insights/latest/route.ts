import { createClient } from '@/lib/supabase/server'
import { generateWeeklyInsight } from '@/lib/claude/insights'
import { NextResponse } from 'next/server'

const MODEL = 'claude-sonnet-4-5'
const CACHE_DAYS = 7
const WINDOW_DAYS = 14

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Return cached insight if one exists within the last 7 days
  const { data: cached } = await supabase
    .from('insights')
    .select('id, type, content, period_start, period_end, created_at, model_used')
    .eq('user_id', user.id)
    .eq('type', 'weekly_summary')
    .gte('created_at', new Date(Date.now() - CACHE_DAYS * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (cached) return NextResponse.json({ insight: cached })

  // 2. Fetch context data for the 14-day window
  const periodEnd = new Date()
  const periodStart = new Date(Date.now() - WINDOW_DAYS * 86400000)
  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  const [profileRes, activitiesRes, sleepRes, bodyRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('goal, max_hr_bpm, weight_kg')
      .eq('id', user.id)
      .single(),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_date_utc', periodStartISO)
      .lte('start_date_utc', periodEndISO)
      .order('start_date_utc', { ascending: false }),
    supabase
      .from('sleep_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', periodStart.toISOString().slice(0, 10))
      .lte('date', periodEnd.toISOString().slice(0, 10))
      .order('date', { ascending: false }),
    supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // 3. Generate insight — do not write to DB if this throws
  let content: string
  try {
    content = await generateWeeklyInsight({
      profile: profileRes.data ?? { goal: null, max_hr_bpm: null, weight_kg: null },
      activities: activitiesRes.data ?? [],
      sleep: sleepRes.data ?? [],
      bodyComp: bodyRes.data ?? null,
    })
  } catch (err) {
    console.error('generateWeeklyInsight failed:', err)
    return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 })
  }

  // 4. Persist the result
  const { data: inserted, error: insertError } = await supabase
    .from('insights')
    .insert({
      user_id: user.id,
      type: 'weekly_summary',
      content,
      model_used: MODEL,
      period_start: periodStart.toISOString().slice(0, 10),
      period_end: periodEnd.toISOString().slice(0, 10),
    })
    .select('id, type, content, period_start, period_end, created_at, model_used')
    .single()

  if (insertError || !inserted) {
    console.error('Failed to persist insight:', insertError)
    return NextResponse.json({ error: 'Failed to save insight' }, { status: 500 })
  }

  return NextResponse.json({ insight: inserted })
}
