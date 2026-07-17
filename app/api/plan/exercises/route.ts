import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { session_id, exercise_name } = body

  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
  }
  if (typeof exercise_name !== 'string' || !exercise_name.trim()) {
    return NextResponse.json({ error: 'exercise_name is required' }, { status: 400 })
  }

  const { data: session } = await supabase
    .from('workout_plan_sessions')
    .select('id')
    .eq('id', session_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

  const { data: exercise, error } = await supabase
    .from('workout_plan_exercises')
    .insert({
      user_id: user.id,
      session_id,
      order_index: Number.isInteger(Number(body.order_index)) ? Number(body.order_index) : 0,
      exercise_name: exercise_name.trim(),
      prescribed_sets: optionalNumber(body.prescribed_sets),
      prescribed_reps: typeof body.prescribed_reps === 'string' && body.prescribed_reps.trim() ? body.prescribed_reps.trim() : null,
      prescribed_weight_kg: optionalNumber(body.prescribed_weight_kg),
      target_rpe: typeof body.target_rpe === 'string' && body.target_rpe.trim() ? body.target_rpe.trim() : null,
      superset_group: optionalNumber(body.superset_group),
      rest_seconds: optionalNumber(body.rest_seconds),
      is_isometric: Boolean(body.is_isometric),
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercise }, { status: 201 })
}
