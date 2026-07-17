import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normalizeSavedPortionName } from '@/lib/nutrition/portions'
import { resolveMealLogItem } from '@/lib/nutrition/log-entry'

const MEALS = ['breakfast', 'midday', 'pre_workout', 'post_workout', 'dinner', 'snack']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// POST {
//   date, meal_name,
//   item: { food_item_id?, name, quantity, calories, protein_g, carbs_g, fat_g },
//   save_as_portion?: boolean
// }
// Creates the day's meal_log on demand, inserts the item, optionally saves the
// portion for reuse. Returns { mealLog, item, savedPortion? }.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, meal_name, item, save_as_portion } = body

  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (!MEALS.includes(meal_name)) {
    return NextResponse.json({ error: 'invalid meal_name' }, { status: 400 })
  }
  if (!item) return NextResponse.json({ error: 'item is required' }, { status: 400 })
  const quantity = Number(item.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'item.quantity must be positive' }, { status: 400 })
  }

  let ownedFood = null
  if (item.food_item_id) {
    const { data, error: foodError } = await supabase
      .from('food_items')
      .select('id, name, calories, protein_g, carbs_g, fat_g')
      .eq('id', item.food_item_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (foodError) return NextResponse.json({ error: foodError.message }, { status: 500 })
    ownedFood = data
  }
  const resolvedItem = resolveMealLogItem({ ...item, quantity }, ownedFood)
  if (!resolvedItem) {
    return NextResponse.json({ error: item.food_item_id ? 'food not found' : 'invalid custom item' }, { status: item.food_item_id ? 404 : 400 })
  }

  // Find or create the meal log for this date + meal.
  const { data: existingLog } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .eq('meal_name', meal_name)
    .maybeSingle()

  let mealLog = existingLog
  if (!mealLog) {
    const { data: createdLog, error: createError } = await supabase
      .from('meal_logs')
      .insert({ user_id: user.id, date, meal_name })
      .select()
      .single()
    if (createError) return NextResponse.json({ error: createError.message }, { status: 500 })
    mealLog = createdLog
  }

  const { data: insertedItem, error: itemError } = await supabase
    .from('meal_log_items')
    .insert({
      meal_log_id: mealLog.id,
      ...resolvedItem,
    })
    .select()
    .single()
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  let savedPortion = null
  if (save_as_portion && !resolvedItem.food_item_id) {
    const name = resolvedItem.name.replace(/\s+/g, ' ')
    // Saved portions store per-1-quantity macros so they scale on reuse.
    const { data: portion, error: portionError } = await supabase
      .from('saved_food_portions')
      .upsert(
        {
          user_id: user.id,
          normalized_name: normalizeSavedPortionName(name),
          name,
          calories: Math.round(resolvedItem.calories / quantity),
          protein_g: Math.round((resolvedItem.protein_g / quantity) * 10) / 10,
          carbs_g: Math.round((resolvedItem.carbs_g / quantity) * 10) / 10,
          fat_g: Math.round((resolvedItem.fat_g / quantity) * 10) / 10,
        },
        { onConflict: 'user_id,normalized_name' },
      )
      .select()
      .single()
    if (!portionError) savedPortion = portion
  }

  return NextResponse.json({ mealLog, item: insertedItem, savedPortion }, { status: 201 })
}
