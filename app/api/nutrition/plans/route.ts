import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildNutritionPlanStoragePath,
  isValidNutritionPlanRange,
  validateNutritionPlanUpload,
} from '@/lib/nutrition/plan-document'
import { getNutritionPlanModeTransition } from '@/lib/nutrition/plan-mode-transition'
import { parsePlanTargets, planTargetInsert } from '@/lib/nutrition/plan-targets'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: plans, error } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('starts_on', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plans })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let uploadedPath: string | null = null
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new Error('PDF file is required')
    const upload = validateNutritionPlanUpload(file)
    const title = String(form.get('title') ?? '').trim()
    const startsOn = String(form.get('starts_on') ?? '')
    const endsOnValue = String(form.get('ends_on') ?? '').trim()
    const endsOn = endsOnValue || null
    const parsedTargets = parsePlanTargets({
      calories_target: String(form.get('calories_target') ?? ''),
      protein_target_g: String(form.get('protein_target_g') ?? ''),
      carbs_target_g: String(form.get('carbs_target_g') ?? ''),
      fat_target_g: String(form.get('fat_target_g') ?? ''),
    })
    if (!title) throw new Error('Title is required')
    if (!isValidNutritionPlanRange(startsOn, endsOn)) throw new Error('Invalid effective dates')
    if (!parsedTargets.ok) throw new Error(`Invalid ${parsedTargets.field}: ${parsedTargets.code}`)

    const planId = crypto.randomUUID()
    uploadedPath = buildNutritionPlanStoragePath(user.id, planId, upload.filename)
    const { error: uploadError } = await supabase.storage
      .from('nutrition-plans')
      .upload(uploadedPath, file, { contentType: upload.mimeType, upsert: false })
    if (uploadError) throw uploadError

    const { data: plan, error: insertError } = await supabase
      .from('nutrition_plans')
      .insert({
        id: planId,
        user_id: user.id,
        title,
        provider_name: String(form.get('provider_name') ?? '').trim() || null,
        ...planTargetInsert(parsedTargets.targets),
        starts_on: startsOn,
        ends_on: endsOn,
        storage_path: uploadedPath,
        original_filename: file.name,
        mime_type: upload.mimeType,
        notes: String(form.get('notes') ?? '').trim() || null,
        active: false,
      })
      .select()
      .single()
    if (insertError) throw insertError

    const { data: previousActive } = await supabase
      .from('nutrition_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('active', true)
    await supabase
      .from('nutrition_plans')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('active', true)

    const { data: activePlan, error: activateError } = await supabase
      .from('nutrition_plans')
      .update({ active: true, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
      .eq('user_id', user.id)
      .select()
      .single()
    if (activateError) {
      if (previousActive?.length) {
        await supabase.from('nutrition_plans').update({ active: true }).in('id', previousActive.map((item) => item.id))
      }
      throw activateError
    }

    const { error: modeError } = await supabase
      .from('user_profiles')
      .update({ nutrition_tracking_mode: getNutritionPlanModeTransition('upload') })
      .eq('id', user.id)
    if (modeError) {
      const { error: deleteMetadataError } = await supabase
        .from('nutrition_plans')
        .delete()
        .eq('id', activePlan.id)
        .eq('user_id', user.id)
      const { error: restoreError } = previousActive?.length
        ? await supabase
            .from('nutrition_plans')
            .update({ active: true, updated_at: new Date().toISOString() })
            .in('id', previousActive.map((item) => item.id))
        : { error: null }
      const { error: removeObjectError } = await supabase.storage
        .from('nutrition-plans')
        .remove([uploadedPath])
      uploadedPath = null
      const compensationError = deleteMetadataError ?? restoreError ?? removeObjectError
      return NextResponse.json(
        { error: compensationError ? `Nutrition mode update failed; rollback failed: ${compensationError.message}` : modeError.message },
        { status: 500 },
      )
    }

    uploadedPath = null
    return NextResponse.json({ plan: activePlan }, { status: 201 })
  } catch (error) {
    if (uploadedPath) {
      await supabase.from('nutrition_plans').delete().eq('storage_path', uploadedPath).eq('user_id', user.id)
      await supabase.storage.from('nutrition-plans').remove([uploadedPath])
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid nutrition plan' }, { status: 400 })
  }
}
