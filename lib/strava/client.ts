import { createAdminClient } from '@/lib/supabase/admin'

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'
const STRAVA_API_URL = 'https://www.strava.com/api/v3'

export async function getValidStravaToken(userId: string): Promise<string> {
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('strava_access_token, strava_refresh_token, strava_token_expires')
    .eq('id', userId)
    .single()

  if (!profile?.strava_access_token) throw new Error('No Strava token for user')

  const expiresAt = profile.strava_token_expires
    ? new Date(profile.strava_token_expires)
    : new Date(0)

  if (expiresAt > new Date()) {
    return profile.strava_access_token
  }

  // Token expired — refresh
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: profile.strava_refresh_token,
    }),
  })

  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)

  const tokens = await res.json()

  await supabase
    .from('user_profiles')
    .update({
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token,
      strava_token_expires: new Date(tokens.expires_at * 1000).toISOString(),
    })
    .eq('id', userId)

  return tokens.access_token
}

export async function fetchStravaActivity(stravaActivityId: number, accessToken: string) {
  const res = await fetch(`${STRAVA_API_URL}/activities/${stravaActivityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
  return res.json()
}

export async function fetchStravaActivities(
  accessToken: string,
  after: number,
  page = 1
): Promise<unknown[]> {
  const res = await fetch(
    `${STRAVA_API_URL}/athlete/activities?after=${after}&per_page=200&page=${page}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
  return res.json()
}
