import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type PhaseUpdate = Database['public']['Tables']['training_phases']['Update']

const KINDS = ['bulk', 'cut', 'maintenance']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: PhaseUpdate = {}

  if (body.kind !== undefined) {
    if (!KINDS.includes(body.kind)) {
      return NextResponse.json({ error: 'kind must be bulk, cut, or maintenance' }, { status: 400 })
    }
    update.kind = body.kind
  }
  for (const field of ['start_date', 'end_date'] as const) {
    if (body[field] !== undefined) {
      if (body[field] !== null && (typeof body[field] !== 'string' || !DATE_RE.test(body[field]))) {
        return NextResponse.json({ error: `${field} must be YYYY-MM-DD or null` }, { status: 400 })
      }
      update[field] = body[field]
    }
  }
  if (body.target_rate_kg_per_week !== undefined) {
    update.target_rate_kg_per_week =
      body.target_rate_kg_per_week != null && Number.isFinite(Number(body.target_rate_kg_per_week))
        ? Number(body.target_rate_kg_per_week)
        : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data: phase, error } = await supabase
    .from('training_phases')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ phase })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('training_phases')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
