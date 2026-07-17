import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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
  const { exercise_id, exercise_name, set_number, weight_kg, reps, rpe, notes } = body

  if (typeof exercise_name !== 'string' || !exercise_name.trim()) {
    return NextResponse.json({ error: 'exercise_name is required' }, { status: 400 })
  }
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
      exercise_id: exercise_id ?? null,
      exercise_name: exercise_name.trim(),
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
