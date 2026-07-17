import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type SessionUpdate = Database['public']['Tables']['workout_plan_sessions']['Update']

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const SESSION_TYPES = ['strength', 'activation', 'cardio', 'other']

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: SessionUpdate = {}

  if (body.week_number !== undefined) {
    const week = Number(body.week_number)
    if (!Number.isInteger(week) || week < 1 || week > 52) {
      return NextResponse.json({ error: 'week_number must be 1-52' }, { status: 400 })
    }
    update.week_number = week
  }
  if (body.day_of_week !== undefined) {
    if (!DAYS.includes(body.day_of_week)) {
      return NextResponse.json({ error: 'day_of_week must be monday…sunday' }, { status: 400 })
    }
    update.day_of_week = body.day_of_week
  }
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 })
    }
    update.title = body.title.trim()
  }
  if (body.session_type !== undefined) {
    if (!SESSION_TYPES.includes(body.session_type)) {
      return NextResponse.json({ error: 'invalid session_type' }, { status: 400 })
    }
    update.session_type = body.session_type
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data: session, error } = await supabase
    .from('workout_plan_sessions')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('workout_plan_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
