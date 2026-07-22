import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { resolvePerformedSetLogLink, resolveSetLogExercise } from '@/lib/workout/set-log'

// GET /api/set-logs?exercise_ids=a,b,c — recent logs for those plan exercises.
// GET /api/set-logs?exercise_name=Deadlift — recent logs by name (history across plans).
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const exerciseIds = searchParams.get('exercise_ids')?.split(',').filter(Boolean) ?? []
  const exerciseName = searchParams.get('exercise_name')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 500)

  let query = supabase
    .from('workout_set_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (exerciseIds.length) query = query.in('exercise_id', exerciseIds)
  else if (exerciseName) query = query.eq('exercise_name', exerciseName)

  const { data: logs, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    exercise_id,
    performed_workout_id,
    performed_exercise_id,
    exercise_name,
    set_number,
    weight_kg,
    reps,
    rpe,
    notes,
  } = body

  const hasPerformedLink = Boolean(performed_workout_id || performed_exercise_id)
  let performedLink: ReturnType<typeof resolvePerformedSetLogLink> = null
  if (hasPerformedLink) {
    let ownedPerformedExercise: {
      id: string
      performed_workout_id: string
      exercise_name: string
    } | null = null
    if (performed_workout_id && performed_exercise_id) {
      const { data, error: performedError } = await supabase
        .from('performed_workout_exercises')
        .select('id, performed_workout_id, exercise_name')
        .eq('id', performed_exercise_id)
        .eq('performed_workout_id', performed_workout_id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (performedError) return NextResponse.json({ error: performedError.message }, { status: 500 })
      ownedPerformedExercise = data
    }
    performedLink = resolvePerformedSetLogLink(
      { performed_workout_id, performed_exercise_id },
      ownedPerformedExercise,
    )
    if (!performedLink) {
      return NextResponse.json(
        { error: 'performed exercise not found or workout link invalid' },
        { status: performed_workout_id && performed_exercise_id ? 404 : 400 },
      )
    }
  }

  let ownedExercise: { id: string; exercise_name: string } | null = null
  if (exercise_id && !performedLink) {
    const { data, error: exerciseError } = await supabase
      .from('workout_plan_exercises')
      .select('id, exercise_name')
      .eq('id', exercise_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (exerciseError) return NextResponse.json({ error: exerciseError.message }, { status: 500 })
    ownedExercise = data
  }
  const resolvedExercise = performedLink
    ? {
        exercise_id: null,
        exercise_name: performedLink.exercise_name,
      }
    : resolveSetLogExercise({ exercise_id, exercise_name }, ownedExercise)
  if (!resolvedExercise) return NextResponse.json({ error: 'exercise not found or name missing' }, { status: exercise_id ? 404 : 400 })
  const weight = weight_kg == null ? null : Number(weight_kg)
  if (weight != null && (!Number.isFinite(weight) || weight < 0)) {
    return NextResponse.json({ error: 'weight_kg must be a non-negative number' }, { status: 400 })
  }
  const repsNum = reps == null ? null : Number(reps)
  if (repsNum != null && (!Number.isInteger(repsNum) || repsNum < 0)) {
    return NextResponse.json({ error: 'reps must be a non-negative integer' }, { status: 400 })
  }
  const rpeNum = rpe == null ? null : Number(rpe)
  if (rpeNum != null && (!Number.isFinite(rpeNum) || rpeNum < 0 || rpeNum > 10)) {
    return NextResponse.json({ error: 'rpe must be between 0 and 10' }, { status: 400 })
  }

  const { data: log, error } = await supabase
    .from('workout_set_logs')
    .insert({
      user_id: user.id,
      exercise_id: resolvedExercise.exercise_id,
      performed_workout_id: performedLink?.performed_workout_id ?? null,
      performed_exercise_id: performedLink?.performed_exercise_id ?? null,
      exercise_name: resolvedExercise.exercise_name,
      set_number: Number.isInteger(Number(set_number)) ? Number(set_number) : null,
      weight_kg: weight,
      reps: repsNum,
      rpe: rpeNum,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ log }, { status: 201 })
}
