import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const SESSION_TYPES = ['strength', 'activation', 'cardio', 'other']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { plan_id, week_number, day_of_week, title, session_type = 'strength', notes } = body

  const week = Number(week_number)
  if (!plan_id || !Number.isInteger(week) || week < 1 || week > 52) {
    return NextResponse.json({ error: 'plan_id and week_number (1-52) are required' }, { status: 400 })
  }
  if (!DAYS.includes(day_of_week)) {
    return NextResponse.json({ error: 'day_of_week must be monday…sunday' }, { status: 400 })
  }
  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (!SESSION_TYPES.includes(session_type)) {
    return NextResponse.json({ error: 'invalid session_type' }, { status: 400 })
  }

  // RLS-scoped read doubles as the ownership check on the parent plan.
  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('id', plan_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'plan not found' }, { status: 404 })

  const { data: session, error } = await supabase
    .from('workout_plan_sessions')
    .insert({
      user_id: user.id,
      plan_id,
      week_number: week,
      day_of_week,
      title: title.trim(),
      session_type,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session }, { status: 201 })
}
