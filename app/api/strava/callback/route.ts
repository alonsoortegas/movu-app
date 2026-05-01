import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const error = searchParams.get('error')

  if (error || !code || !userId) {
    return NextResponse.redirect(`${origin}/profile?strava=denied`)
  }

  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${origin}/profile?strava=error`)
  }

  const tokens = await tokenRes.json()
  const supabase = createAdminClient()

  await supabase
    .from('user_profiles')
    .update({
      strava_athlete_id: tokens.athlete.id,
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token,
      strava_token_expires: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq('id', userId)

  // Fire backfill in the background (no await — don't block the redirect)
  fetch(`${origin}/api/strava/backfill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  }).catch(() => {})

  return NextResponse.redirect(`${origin}/dashboard?strava=connected`)
}
