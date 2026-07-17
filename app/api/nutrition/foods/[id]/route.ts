import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type FoodUpdate = Database['public']['Tables']['food_items']['Update']

const CATEGORIES = ['protein', 'carb', 'fat', 'mixed', 'veg']
const UNITS = ['piece', 'cup', 'grams', 'scoop', 'slice']

function macro(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const update: FoodUpdate = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }
    update.name = body.name.trim()
  }
  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category)) return NextResponse.json({ error: 'invalid category' }, { status: 400 })
    update.category = body.category
  }
  if (body.portion_label !== undefined) {
    if (typeof body.portion_label !== 'string' || !body.portion_label.trim()) {
      return NextResponse.json({ error: 'portion_label must be a non-empty string' }, { status: 400 })
    }
    update.portion_label = body.portion_label.trim()
  }
  if (body.tracking_unit !== undefined) {
    if (!UNITS.includes(body.tracking_unit)) return NextResponse.json({ error: 'invalid tracking_unit' }, { status: 400 })
    update.tracking_unit = body.tracking_unit
  }
  if (body.grams !== undefined) {
    update.grams = body.grams != null && Number.isFinite(Number(body.grams)) ? Number(body.grams) : null
  }
  for (const field of ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const) {
    if (body[field] !== undefined) {
      update[field] = field === 'calories' ? Math.round(macro(body[field])) : macro(body[field])
    }
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const { data: food, error } = await supabase
    .from('food_items')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase.from('food_items').delete().eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
