import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const CATEGORIES = ['protein', 'carb', 'fat', 'mixed', 'veg']
const UNITS = ['piece', 'cup', 'grams', 'scoop', 'slice']

function macro(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : 0
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: foods, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ foods })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, category, portion_label, tracking_unit = 'grams' } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'invalid category' }, { status: 400 })
  }
  if (typeof portion_label !== 'string' || !portion_label.trim()) {
    return NextResponse.json({ error: 'portion_label is required' }, { status: 400 })
  }
  if (!UNITS.includes(tracking_unit)) {
    return NextResponse.json({ error: 'invalid tracking_unit' }, { status: 400 })
  }

  const { data: food, error } = await supabase
    .from('food_items')
    .insert({
      user_id: user.id,
      name: name.trim(),
      category,
      portion_label: portion_label.trim(),
      grams: body.grams != null && Number.isFinite(Number(body.grams)) ? Number(body.grams) : null,
      calories: Math.round(macro(body.calories)),
      protein_g: macro(body.protein_g),
      carbs_g: macro(body.carbs_g),
      fat_g: macro(body.fat_g),
      tracking_unit,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ food }, { status: 201 })
}
