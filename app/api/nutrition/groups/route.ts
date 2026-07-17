import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MACRO_TYPES = ['carb', 'protein']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [groupsResult, itemsResult] = await Promise.all([
    supabase.from('food_substitution_groups').select('*').eq('user_id', user.id).order('name'),
    supabase.from('food_substitution_group_items').select('*'),
  ])
  if (groupsResult.error) return NextResponse.json({ error: groupsResult.error.message }, { status: 500 })
  if (itemsResult.error) return NextResponse.json({ error: itemsResult.error.message }, { status: 500 })

  const groupIds = new Set((groupsResult.data ?? []).map((g) => g.id))
  const items = (itemsResult.data ?? []).filter((i) => groupIds.has(i.group_id))
  return NextResponse.json({ groups: groupsResult.data ?? [], items })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, macro_type, target_macro_g, notes } = body

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  if (!MACRO_TYPES.includes(macro_type)) {
    return NextResponse.json({ error: 'macro_type must be carb or protein' }, { status: 400 })
  }
  const target = Number(target_macro_g)
  if (!Number.isFinite(target) || target <= 0) {
    return NextResponse.json({ error: 'target_macro_g must be a positive number' }, { status: 400 })
  }

  const { data: group, error } = await supabase
    .from('food_substitution_groups')
    .insert({
      user_id: user.id,
      name: name.trim(),
      macro_type,
      target_macro_g: target,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ group }, { status: 201 })
}
