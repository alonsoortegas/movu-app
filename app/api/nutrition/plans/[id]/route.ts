import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNutritionPlanModeTransition } from '@/lib/nutrition/plan-mode-transition'
import { parsePlanTargets, planTargetInsert } from '@/lib/nutrition/plan-targets'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { data, error } = await supabase.storage
    .from('nutrition-plans')
    .createSignedUrl(plan.storage_path, 600)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan, signedUrl: data.signedUrl, expiresIn: 600 })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsedTargets = parsePlanTargets({
    calories_target: body.calories_target == null ? '' : String(body.calories_target),
    protein_target_g: body.protein_target_g == null ? '' : String(body.protein_target_g),
    carbs_target_g: body.carbs_target_g == null ? '' : String(body.carbs_target_g),
    fat_target_g: body.fat_target_g == null ? '' : String(body.fat_target_g),
  })
  if (!parsedTargets.ok) {
    return NextResponse.json(
      { error: `Invalid ${parsedTargets.field}: ${parsedTargets.code}` },
      { status: 400 },
    )
  }

  const { data: plan, error } = await supabase
    .from('nutrition_plans')
    .update({
      ...planTargetInsert(parsedTargets.targets),
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  return NextResponse.json({ plan })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: plan, error } = await supabase
    .from('nutrition_plans')
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('active', true)
    .select()
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const { error: modeError } = await supabase
    .from('user_profiles')
    .update({ nutrition_tracking_mode: getNutritionPlanModeTransition('archive') })
    .eq('id', user.id)
  if (modeError) {
    const { error: restoreError } = await supabase
      .from('nutrition_plans')
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
      .eq('user_id', user.id)
    return NextResponse.json(
      { error: restoreError ? `Nutrition mode update failed; rollback failed: ${restoreError.message}` : modeError.message },
      { status: 500 },
    )
  }
  return NextResponse.json({ plan })
}
