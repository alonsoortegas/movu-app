import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI!,
    response_type: 'code',
    scope: 'activity:read_all,profile:read_all',
    state: user.id,
    approval_prompt: 'auto',
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
