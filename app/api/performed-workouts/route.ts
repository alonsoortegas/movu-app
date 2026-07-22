import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildPerformedWorkoutInsert,
  snapshotPerformedExercise,
  type PerformedWorkoutOrigin,
  type PerformedWorkoutStatus,
} from '@/lib/workout/performed-session'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: workouts, error } = await supabase
    .from('performed_workouts')
    .select('*, performed_workout_exercises (*)')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ workouts })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    let title = typeof body.title === 'string' ? body.title : ''
    let workoutType = typeof body.workout_type === 'string' ? body.workout_type : 'other'
    let origin: PerformedWorkoutOrigin = body.plan_session_id ? 'planned' : 'manual'
    let sourceExercises: Array<Record<string, unknown>> = Array.isArray(body.exercises)
      ? body.exercises
      : []

    if (body.plan_session_id) {
      const { data: session, error: sessionError } = await supabase
        .from('workout_plan_sessions')
        .select('*')
        .eq('id', body.plan_session_id)
        .eq('user_id', user.id)
        .single()
      if (sessionError || !session) {
        return NextResponse.json({ error: 'Plan session not found' }, { status: 404 })
      }
      const { data: planExercises, error: exercisesError } = await supabase
        .from('workout_plan_exercises')
        .select('*')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .order('order_index')
      if (exercisesError) return NextResponse.json({ error: exercisesError.message }, { status: 500 })

      title = session.title
      workoutType = session.session_type
      origin = 'planned'
      sourceExercises = planExercises ?? []
    }

    const workoutInsert = buildPerformedWorkoutInsert({
      userId: user.id,
      planSessionId: body.plan_session_id ?? null,
      activityId: body.activity_id ?? null,
      origin,
      title,
      workoutType,
      performedOn: body.performed_on,
      startedAt: body.started_at,
      endedAt: body.ended_at ?? null,
      durationMin: body.duration_min ?? null,
      notes: body.notes ?? null,
      status: (body.status as PerformedWorkoutStatus | undefined) ?? 'in_progress',
    })

    const { data: workout, error: workoutError } = await supabase
      .from('performed_workouts')
      .insert(workoutInsert)
      .select()
      .single()
    if (workoutError) {
      if (workoutError.code === '23505' && body.plan_session_id) {
        const { data: existing } = await supabase
          .from('performed_workouts')
          .select('*')
          .eq('user_id', user.id)
          .eq('plan_session_id', body.plan_session_id)
          .eq('performed_on', body.performed_on)
          .maybeSingle()
        if (existing) {
          const { data: existingExercises } = await supabase
            .from('performed_workout_exercises')
            .select('*')
            .eq('performed_workout_id', existing.id)
            .eq('user_id', user.id)
            .order('order_index')
          return NextResponse.json({ workout: existing, exercises: existingExercises ?? [], resumed: true })
        }
      }
      return NextResponse.json({ error: workoutError.message }, { status: workoutError.code === '23505' ? 409 : 500 })
    }

    const exerciseInserts = sourceExercises.map((exercise, index) => ({
      user_id: user.id,
      performed_workout_id: workout.id,
      ...snapshotPerformedExercise({
        catalogExerciseId:
          typeof exercise.catalog_exercise_id === 'string' ? exercise.catalog_exercise_id : null,
        exerciseName:
          typeof exercise.exercise_name === 'string'
            ? exercise.exercise_name
            : typeof exercise.name === 'string'
              ? exercise.name
              : '',
        primaryMuscleGroup:
          typeof exercise.primary_muscle_group === 'string'
            ? exercise.primary_muscle_group
            : null,
        prescribedSets:
          typeof exercise.prescribed_sets === 'number' ? exercise.prescribed_sets : null,
        prescribedReps:
          typeof exercise.prescribed_reps === 'string' ? exercise.prescribed_reps : null,
        prescribedWeightKg:
          typeof exercise.prescribed_weight_kg === 'number'
            ? exercise.prescribed_weight_kg
            : null,
        targetRpe: typeof exercise.target_rpe === 'string' ? exercise.target_rpe : null,
        targetRir: typeof exercise.target_rir === 'string' ? exercise.target_rir : null,
        restSeconds: typeof exercise.rest_seconds === 'number' ? exercise.rest_seconds : null,
        orderIndex: typeof exercise.order_index === 'number' ? exercise.order_index : index,
        notes: typeof exercise.notes === 'string' ? exercise.notes : null,
      }),
    }))

    let exercises: unknown[] = []
    if (exerciseInserts.length) {
      const { data, error: insertError } = await supabase
        .from('performed_workout_exercises')
        .insert(exerciseInserts)
        .select()
      if (insertError) {
        await supabase.from('performed_workouts').delete().eq('id', workout.id).eq('user_id', user.id)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      exercises = data ?? []
    }

    return NextResponse.json({ workout, exercises }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid performed workout' },
      { status: 400 },
    )
  }
}
