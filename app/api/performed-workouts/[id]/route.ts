import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPerformedWorkoutInsert, snapshotPerformedExercise } from '@/lib/workout/performed-session'

async function ownedWorkout(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, workout: null, error: null }
  const { data: workout, error } = await supabase
    .from('performed_workouts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  return { supabase, user, workout, error }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, workout, error } = await ownedWorkout(id)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

  const [{ data: exercises, error: exerciseError }, { data: logs, error: logsError }] =
    await Promise.all([
      supabase
        .from('performed_workout_exercises')
        .select('*')
        .eq('performed_workout_id', id)
        .eq('user_id', user.id)
        .order('order_index'),
      supabase
        .from('workout_set_logs')
        .select('*')
        .eq('performed_workout_id', id)
        .eq('user_id', user.id)
        .order('logged_at'),
    ])
  const queryError = exerciseError ?? logsError
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 })
  return NextResponse.json({ workout, exercises: exercises ?? [], logs: logs ?? [] })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, workout, error } = await ownedWorkout(id)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })

  const body = await request.json()
  if (body.action === 'add_exercise') {
    if (workout.status === 'completed') {
      return NextResponse.json({ error: 'Reopen the workout before editing exercises' }, { status: 409 })
    }
    const snapshot = snapshotPerformedExercise({
      catalogExerciseId: body.exercise?.catalog_exercise_id ?? null,
      exerciseName: body.exercise?.exercise_name ?? '',
      primaryMuscleGroup: body.exercise?.primary_muscle_group ?? null,
      prescribedSets: body.exercise?.prescribed_sets ?? null,
      prescribedReps: body.exercise?.prescribed_reps ?? null,
      prescribedWeightKg: body.exercise?.prescribed_weight_kg ?? null,
      targetRpe: body.exercise?.target_rpe ?? null,
      targetRir: body.exercise?.target_rir ?? null,
      restSeconds: body.exercise?.rest_seconds ?? null,
      orderIndex: body.exercise?.order_index ?? 0,
      notes: body.exercise?.notes ?? null,
    })
    if (!snapshot.exercise_name) {
      return NextResponse.json({ error: 'Exercise name is required' }, { status: 400 })
    }
    const { data: exercise, error: insertError } = await supabase
      .from('performed_workout_exercises')
      .insert({ user_id: user.id, performed_workout_id: id, ...snapshot })
      .select()
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ workout, exercise })
  }

  if (body.action === 'remove_exercise') {
    if (workout.status === 'completed') {
      return NextResponse.json({ error: 'Reopen the workout before editing exercises' }, { status: 409 })
    }
    const { error: deleteError } = await supabase
      .from('performed_workout_exercises')
      .delete()
      .eq('id', body.exercise_id)
      .eq('performed_workout_id', id)
      .eq('user_id', user.id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    return NextResponse.json({ workout })
  }

  const nextStatus = body.action === 'reopen' ? 'in_progress' : (body.status ?? workout.status)
  const endedAt = nextStatus === 'completed'
    ? (body.ended_at ?? new Date().toISOString())
    : body.action === 'reopen'
      ? null
      : workout.ended_at
  try {
    const normalized = buildPerformedWorkoutInsert({
      userId: user.id,
      planSessionId: workout.plan_session_id,
      activityId: workout.activity_id,
      origin: workout.origin as 'planned' | 'manual' | 'whoop' | 'apple_health',
      title: body.title ?? workout.title,
      workoutType: body.workout_type ?? workout.workout_type,
      performedOn: body.performed_on ?? workout.performed_on,
      startedAt: body.started_at ?? workout.started_at,
      endedAt,
      durationMin: body.duration_min ?? workout.duration_min,
      notes: body.notes ?? workout.notes,
      status: nextStatus,
    })
    const { data: updated, error: updateError } = await supabase
      .from('performed_workouts')
      .update({
        title: normalized.title,
        workout_type: normalized.workout_type,
        performed_on: normalized.performed_on,
        started_at: normalized.started_at,
        ended_at: normalized.ended_at,
        duration_min: normalized.duration_min,
        notes: normalized.notes,
        status: normalized.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ workout: updated })
  } catch (validationError) {
    return NextResponse.json(
      { error: validationError instanceof Error ? validationError.message : 'Invalid workout' },
      { status: 400 },
    )
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, user, workout, error } = await ownedWorkout(id)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!workout) return NextResponse.json({ error: 'Workout not found' }, { status: 404 })
  if (workout.status === 'completed') {
    return NextResponse.json({ error: 'Completed workouts cannot be deleted' }, { status: 409 })
  }
  const { error: deleteError } = await supabase
    .from('performed_workouts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
