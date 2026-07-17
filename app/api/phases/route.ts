import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isIsoCalendarDate, isValidPhaseRange } from '@/lib/trends/phases'

const KINDS = ['bulk', 'cut', 'maintenance']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: phases, error } = await supabase
    .from('training_phases')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ phases })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { kind, start_date, end_date, target_rate_kg_per_week } = body

  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: 'kind must be bulk, cut, or maintenance' }, { status: 400 })
  }
  if (!isIsoCalendarDate(start_date)) {
    return NextResponse.json({ error: 'start_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (end_date != null && !isIsoCalendarDate(end_date)) {
    return NextResponse.json({ error: 'end_date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (!isValidPhaseRange(start_date, end_date ?? null)) {
    return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 })
  }

  // An open phase (no end_date) supersedes any previous open phase.
  if (end_date == null) {
    const { error: closeError } = await supabase
      .from('training_phases')
      .update({ end_date: start_date })
      .eq('user_id', user.id)
      .is('end_date', null)
    if (closeError) return NextResponse.json({ error: closeError.message }, { status: 500 })
  }

  const { data: phase, error } = await supabase
    .from('training_phases')
    .insert({
      user_id: user.id,
      kind,
      start_date,
      end_date: end_date ?? null,
      target_rate_kg_per_week:
        target_rate_kg_per_week != null && Number.isFinite(Number(target_rate_kg_per_week))
          ? Number(target_rate_kg_per_week)
          : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ phase }, { status: 201 })
}
