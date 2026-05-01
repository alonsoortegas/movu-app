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

  return NextResponse.json({
    id: user.id,
    email: user.email,
    ...profile,
    strava_connected: !!profile?.strava_athlete_id,
  })
}
