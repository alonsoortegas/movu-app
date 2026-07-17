import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'
import { ownsEveryFoodId } from '@/lib/nutrition/log-entry'

type GroupUpdate = Database['public']['Tables']['food_substitution_groups']['Update']

const MACRO_TYPES = ['carb', 'protein']

// PATCH: update group meta and/or replace its item list.
// body.items (optional): [{ food_item_id, quantity, label }]
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const { data: group } = await supabase
    .from('food_substitution_groups')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!group) return NextResponse.json({ error: 'group not found' }, { status: 404 })

  const update: GroupUpdate = {}
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 })
    }
    update.name = body.name.trim()
  }
  if (body.macro_type !== undefined) {
    if (!MACRO_TYPES.includes(body.macro_type)) {
      return NextResponse.json({ error: 'macro_type must be carb or protein' }, { status: 400 })
    }
    update.macro_type = body.macro_type
  }
  if (body.target_macro_g !== undefined) {
    const target = Number(body.target_macro_g)
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: 'target_macro_g must be a positive number' }, { status: 400 })
    }
    update.target_macro_g = target
  }
  if (body.notes !== undefined) {
    update.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  }

  if (Object.keys(update).length) {
    const { error } = await supabase
      .from('food_substitution_groups')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Array.isArray(body.items)) {
    for (const item of body.items) {
      if (!item?.food_item_id || typeof item.label !== 'string' || !item.label.trim()) {
        return NextResponse.json({ error: 'each item needs food_item_id and label' }, { status: 400 })
      }
    }
    const requestedFoodIds = body.items.map((item: { food_item_id: string }) => item.food_item_id)
    if (requestedFoodIds.length) {
      const { data: ownedFoods, error: foodsError } = await supabase
        .from('food_items')
        .select('id')
        .eq('user_id', user.id)
        .in('id', requestedFoodIds)
      if (foodsError) return NextResponse.json({ error: foodsError.message }, { status: 500 })
      if (!ownsEveryFoodId(requestedFoodIds, (ownedFoods ?? []).map((food) => food.id))) {
        return NextResponse.json({ error: 'items must reference distinct owned foods' }, { status: 400 })
      }
    }
    const { error: deleteError } = await supabase
      .from('food_substitution_group_items')
      .delete()
      .eq('group_id', id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    if (body.items.length) {
      const { error: insertError } = await supabase.from('food_substitution_group_items').insert(
        body.items.map((item: { food_item_id: string; quantity?: unknown; label: string }) => ({
          group_id: id,
          food_item_id: item.food_item_id,
          quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          label: item.label.trim(),
        })),
      )
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  const [groupResult, itemsResult] = await Promise.all([
    supabase.from('food_substitution_groups').select('*').eq('id', id).single(),
    supabase.from('food_substitution_group_items').select('*').eq('group_id', id),
  ])
  return NextResponse.json({ group: groupResult.data, items: itemsResult.data ?? [] })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('food_substitution_groups')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
