import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST { plan_id, from_week, to_weeks: number[] }
// Duplicates every session (with its exercises) of from_week into each target week.
// Target weeks keep any sessions they already have — this is additive.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { plan_id, from_week, to_weeks } = body
  const fromWeek = Number(from_week)

  if (!plan_id || !Number.isInteger(fromWeek)) {
    return NextResponse.json({ error: 'plan_id and from_week are required' }, { status: 400 })
  }
  if (!Array.isArray(to_weeks) || to_weeks.length === 0 || to_weeks.some((w) => !Number.isInteger(Number(w)) || Number(w) < 1 || Number(w) > 52 || Number(w) === fromWeek)) {
    return NextResponse.json({ error: 'to_weeks must be week numbers (1-52) different from from_week' }, { status: 400 })
  }

  const { data: plan } = await supabase
    .from('workout_plans')
    .select('id')
    .eq('id', plan_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'plan not found' }, { status: 404 })

  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_plan_sessions')
    .select('*')
    .eq('plan_id', plan_id)
    .eq('week_number', fromWeek)
  if (sessionsError) return NextResponse.json({ error: sessionsError.message }, { status: 500 })
  if (!sessions?.length) return NextResponse.json({ error: 'from_week has no sessions' }, { status: 400 })

  const { data: exercises, error: exercisesError } = await supabase
    .from('workout_plan_exercises')
    .select('*')
    .in('session_id', sessions.map((s) => s.id))
  if (exercisesError) return NextResponse.json({ error: exercisesError.message }, { status: 500 })

  let createdSessions = 0
  let createdExercises = 0
  for (const week of to_weeks.map(Number)) {
    for (const session of sessions) {
      const { data: newSession, error: insertError } = await supabase
        .from('workout_plan_sessions')
        .insert({
          user_id: user.id,
          plan_id,
          week_number: week,
          day_of_week: session.day_of_week,
          title: session.title,
          session_type: session.session_type,
          notes: session.notes,
        })
        .select()
        .single()
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
      createdSessions++

      const sessionExercises = (exercises ?? []).filter((e) => e.session_id === session.id)
      if (sessionExercises.length) {
        const { error: exInsertError } = await supabase.from('workout_plan_exercises').insert(
          sessionExercises.map((e) => ({
            user_id: user.id,
            session_id: newSession.id,
            order_index: e.order_index,
            exercise_name: e.exercise_name,
            prescribed_sets: e.prescribed_sets,
            prescribed_reps: e.prescribed_reps,
            prescribed_weight_kg: e.prescribed_weight_kg,
            target_rpe: e.target_rpe,
            superset_group: e.superset_group,
            rest_seconds: e.rest_seconds,
            is_isometric: e.is_isometric,
            notes: e.notes,
          })),
        )
        if (exInsertError) return NextResponse.json({ error: exInsertError.message }, { status: 500 })
        createdExercises += sessionExercises.length
      }
    }
  }

  return NextResponse.json({ createdSessions, createdExercises }, { status: 201 })
}
