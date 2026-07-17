import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DAY_TYPES = ['hard', 'moderate', 'rest']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: targets, error } = await supabase
    .from('nutrition_targets')
    .select('*')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ targets })
}

// PUT { targets: [{ day_type, calories_target, protein_target, carbs_target, fat_target }] }
// Upserts per day_type.
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  if (!Array.isArray(body.targets) || body.targets.length === 0) {
    return NextResponse.json({ error: 'targets array is required' }, { status: 400 })
  }

  for (const target of body.targets) {
    if (!DAY_TYPES.includes(target?.day_type)) {
      return NextResponse.json({ error: 'day_type must be hard, moderate, or rest' }, { status: 400 })
    }
    for (const field of ['calories_target', 'protein_target', 'carbs_target', 'fat_target']) {
      const value = Number(target[field])
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `${field} must be a non-negative number` }, { status: 400 })
      }
    }
  }

  const rows = body.targets.map(
    (target: { day_type: string; calories_target: unknown; protein_target: unknown; carbs_target: unknown; fat_target: unknown }) => ({
      user_id: user.id,
      day_type: target.day_type,
      calories_target: Math.round(Number(target.calories_target)),
      protein_target: Math.round(Number(target.protein_target)),
      carbs_target: Math.round(Number(target.carbs_target)),
      fat_target: Math.round(Number(target.fat_target)),
    }),
  )

  const { data: targets, error } = await supabase
    .from('nutrition_targets')
    .upsert(rows, { onConflict: 'user_id,day_type' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ targets })
}
