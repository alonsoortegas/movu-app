import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type ProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, city, sex, goal, max_hr_bpm, onboarding_complete, data_source')
    .eq('id', user.id)
    .single()

  const { data: measurement } = await supabase
    .from('body_measurements')
    .select('measured_at, weight_kg, muscle_mass_kg, fat_mass_kg, fat_percentage, visceral_fat_level, bmr_kcal, phase_angle, total_body_water_l, protein_kg, mineral_kg, waist_hip_ratio, muscle_left_arm, muscle_right_arm, muscle_left_leg, muscle_right_leg, muscle_trunk, notes')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    id: user.id,
    email: user.email,
    ...profile,
    body_comp: measurement ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const update: ProfileUpdate = {}
  if (body.full_name !== undefined) update.full_name = body.full_name
  if (body.sex !== undefined) {
    update.sex = ['female', 'male', 'other', 'prefer_not_to_say'].includes(body.sex) ? body.sex : null
  }
  if (body.goal !== undefined) update.goal = body.goal
  if (body.max_hr_bpm !== undefined) update.max_hr_bpm = body.max_hr_bpm

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update(update)
    .eq('id', user.id)
    .select('full_name, city, sex, goal, max_hr_bpm')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile })
}
