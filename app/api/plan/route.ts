import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/plan → the user's active plan with sessions + exercises.
// ?plan_id=<uuid> loads a specific plan instead (for the editor).
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const planId = searchParams.get('plan_id')

  let planQuery = supabase.from('workout_plans').select('*').eq('user_id', user.id)
  planQuery = planId
    ? planQuery.eq('id', planId)
    : planQuery.eq('active', true).order('created_at', { ascending: false })
  const { data: plans, error: planError } = await planQuery.limit(1)
  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  const plan = plans?.[0] ?? null
  if (!plan) return NextResponse.json({ plan: null, sessions: [], exercises: [] })

  const [sessionsResult, exercisesResult] = await Promise.all([
    supabase
      .from('workout_plan_sessions')
      .select('*')
      .eq('plan_id', plan.id)
      .order('week_number', { ascending: true }),
    supabase
      .from('workout_plan_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true }),
  ])
  if (sessionsResult.error) return NextResponse.json({ error: sessionsResult.error.message }, { status: 500 })
  if (exercisesResult.error) return NextResponse.json({ error: exercisesResult.error.message }, { status: 500 })

  const sessionIds = new Set((sessionsResult.data ?? []).map((s) => s.id))
  const exercises = (exercisesResult.data ?? []).filter((e) => sessionIds.has(e.session_id))

  return NextResponse.json({ plan, sessions: sessionsResult.data ?? [], exercises })
}

// POST /api/plan → create a plan. Activating it deactivates any other plan.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, start_date, weeks, active = true, notes } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (typeof start_date !== 'string' || !DATE_RE.test(start_date)) {
    return NextResponse.json({ error: 'start_date must be YYYY-MM-DD' }, { status: 400 })
  }
  const weeksNum = Number(weeks)
  if (!Number.isInteger(weeksNum) || weeksNum < 1 || weeksNum > 52) {
    return NextResponse.json({ error: 'weeks must be an integer between 1 and 52' }, { status: 400 })
  }

  if (active) {
    const { error: deactivateError } = await supabase
      .from('workout_plans')
      .update({ active: false })
      .eq('user_id', user.id)
      .eq('active', true)
    if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 })
  }

  const { data: plan, error } = await supabase
    .from('workout_plans')
    .insert({
      user_id: user.id,
      name: name.trim(),
      start_date,
      weeks: weeksNum,
      active: Boolean(active),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan }, { status: 201 })
}
