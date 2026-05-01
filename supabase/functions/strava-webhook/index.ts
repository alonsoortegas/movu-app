import { corsHeaders } from '../_shared/cors.ts'
import { createAdminClient } from '../_shared/supabase-admin.ts'

const STRAVA_API = 'https://www.strava.com/api/v3'

const CATEGORY_MAP: Record<string, string> = {
  Run: 'run', VirtualRun: 'run', TrailRun: 'run',
  WeightTraining: 'strength', Crossfit: 'strength',
  Workout: 'hiit', HIIT: 'hiit',
  Yoga: 'mobility', Stretching: 'mobility', Pilates: 'mobility',
}

const MUSCLE_MAP: Record<string, string[]> = {
  run: ['legs', 'core'],
  strength: ['full_body'],
  hiit: ['full_body', 'core'],
  mobility: ['full_body'],
  other: [],
}

Deno.serve(async (req) => {
  // Strava subscription validation (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const challenge = url.searchParams.get('hub.challenge')
    const verifyToken = url.searchParams.get('hub.verify_token')

    if (verifyToken !== Deno.env.get('STRAVA_WEBHOOK_VERIFY_TOKEN')) {
      return new Response('Forbidden', { status: 403 })
    }
    return new Response(
      JSON.stringify({ 'hub.challenge': challenge }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const event = await req.json()

  // Only handle activity create/update
  if (event.object_type !== 'activity') {
    return new Response('ok', { status: 200 })
  }

  const supabase = createAdminClient()

  // Find user by strava athlete ID
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, strava_access_token, strava_refresh_token, strava_token_expires')
    .eq('strava_athlete_id', event.owner_id)
    .single()

  if (!profile) return new Response('ok', { status: 200 })

  if (event.aspect_type === 'delete') {
    await supabase.from('activities').delete().eq('strava_id', event.object_id)
    return new Response('ok', { status: 200 })
  }

  // Get a valid access token
  let accessToken = profile.strava_access_token
  if (new Date(profile.strava_token_expires) <= new Date()) {
    const refreshRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('STRAVA_CLIENT_ID'),
        client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
        grant_type: 'refresh_token',
        refresh_token: profile.strava_refresh_token,
      }),
    })
    const tokens = await refreshRes.json()
    accessToken = tokens.access_token
    await supabase.from('user_profiles').update({
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token,
      strava_token_expires: new Date(tokens.expires_at * 1000).toISOString(),
    }).eq('id', profile.id)
  }

  // Fetch full activity from Strava
  const activityRes = await fetch(`${STRAVA_API}/activities/${event.object_id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!activityRes.ok) return new Response('ok', { status: 200 })
  const raw = await activityRes.json()

  const category = CATEGORY_MAP[raw.type] ?? 'other'
  const avgPacePerKmS =
    raw.distance > 0 && category === 'run'
      ? Math.round((raw.moving_time / raw.distance) * 1000)
      : null

  const row = {
    user_id: profile.id,
    strava_id: raw.id,
    source: 'strava',
    activity_type: raw.type,
    activity_category: category,
    activity_name: raw.name,
    start_date_utc: raw.start_date,
    start_date_local: raw.start_date_local,
    moving_time_s: raw.moving_time,
    elapsed_time_s: raw.elapsed_time,
    distance_m: raw.distance || null,
    elevation_gain_m: raw.total_elevation_gain || null,
    avg_hr_bpm: raw.average_heartrate || null,
    max_hr_bpm: raw.max_heartrate || null,
    avg_pace_per_km_s: avgPacePerKmS,
    avg_cadence_spm: raw.average_cadence || null,
    rpe: null,
    inferred_muscle_groups: MUSCLE_MAP[category] ?? [],
    hr_zones: null,
    trainer: raw.trainer ?? false,
  }

  await supabase.from('activities').upsert(row, { onConflict: 'strava_id' })

  return new Response('ok', { status: 200 })
})
