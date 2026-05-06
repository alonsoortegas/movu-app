import { createAdminClient } from '@/lib/supabase/admin'
import { getValidStravaToken, fetchStravaActivities } from '@/lib/strava/client'
import { normalizeActivity, type StravaActivity } from '@/lib/strava/normalize'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const supabase = createAdminClient()
  const accessToken = await getValidStravaToken(user_id)

  const ninetyDaysAgo = Math.floor((Date.now() - 90 * 86400000) / 1000)
  const allActivities: unknown[] = []
  let page = 1

  while (true) {
    const batch = await fetchStravaActivities(accessToken, ninetyDaysAgo, page)
    if (!batch.length) break
    allActivities.push(...batch)
    if (batch.length < 200) break
    page++
  }

  if (allActivities.length === 0) {
    return NextResponse.json({ inserted: 0 })
  }

  const rows = allActivities.map(a => normalizeActivity(a as StravaActivity, user_id))

  const { error } = await supabase
    .from('activities')
    .upsert(rows, { onConflict: 'strava_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: rows.length })
}
