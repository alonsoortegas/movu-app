import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type PlanUpdate = Database['public']['Tables']['workout_plans']['Update']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: PlanUpdate = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }
    update.name = body.name.trim()
  }
  if (body.start_date !== undefined) {
    if (typeof body.start_date !== 'string' || !DATE_RE.test(body.start_date)) {
      return NextResponse.json({ error: 'start_date must be YYYY-MM-DD' }, { status: 400 })
    }
    update.start_date = body.start_date
  }
  if (body.weeks !== undefined) {
    const weeks = Number(body.weeks)
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
      return NextResponse.json({ error: 'weeks must be an integer between 1 and 52' }, { status: 400 })
    }
    update.weeks = weeks
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }
  if (body.active !== undefined) {
    update.active = Boolean(body.active)
    if (update.active) {
      const { error: deactivateError } = await supabase
        .from('workout_plans')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('active', true)
        .neq('id', id)
      if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data: plan, error } = await supabase
    .from('workout_plans')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('workout_plans').delete().eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
