import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type ExerciseUpdate = Database['public']['Tables']['workout_plan_exercises']['Update']

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: ExerciseUpdate = {}

  if (body.exercise_name !== undefined) {
    if (typeof body.exercise_name !== 'string' || !body.exercise_name.trim()) {
      return NextResponse.json({ error: 'exercise_name must be a non-empty string' }, { status: 400 })
    }
    update.exercise_name = body.exercise_name.trim()
  }
  if (body.order_index !== undefined) {
    const order = Number(body.order_index)
    if (!Number.isInteger(order) || order < 0) {
      return NextResponse.json({ error: 'order_index must be a non-negative integer' }, { status: 400 })
    }
    update.order_index = order
  }
  if (body.prescribed_sets !== undefined) update.prescribed_sets = optionalNumber(body.prescribed_sets)
  if (body.prescribed_reps !== undefined) {
    update.prescribed_reps = typeof body.prescribed_reps === 'string' && body.prescribed_reps.trim() ? body.prescribed_reps.trim() : null
  }
  if (body.prescribed_weight_kg !== undefined) update.prescribed_weight_kg = optionalNumber(body.prescribed_weight_kg)
  if (body.target_rpe !== undefined) {
    update.target_rpe = typeof body.target_rpe === 'string' && body.target_rpe.trim() ? body.target_rpe.trim() : null
  }
  if (body.superset_group !== undefined) update.superset_group = optionalNumber(body.superset_group)
  if (body.rest_seconds !== undefined) update.rest_seconds = optionalNumber(body.rest_seconds)
  if (body.is_isometric !== undefined) update.is_isometric = Boolean(body.is_isometric)
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data: exercise, error } = await supabase
    .from('workout_plan_exercises')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ exercise })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('workout_plan_exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
