import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, city, goal, max_hr_bpm, strava_athlete_id, onboarding_complete')
    .eq('id', user.id)
    .single()

  const { data: measurement } = await supabase
    .from('body_measurements')
    .select('muscle_mass_kg, fat_mass_kg, fat_percentage, weight_kg')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    id: user.id,
    email: user.email,
    ...profile,
    strava_connected: !!profile?.strava_athlete_id,
    body_comp: measurement ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (body.full_name !== undefined) update.full_name = body.full_name
  if (body.goal !== undefined) update.goal = body.goal
  if (body.max_hr_bpm !== undefined) update.max_hr_bpm = body.max_hr_bpm

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update(update)
    .eq('id', user.id)
    .select('full_name, city, goal, max_hr_bpm')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ profile })
}
