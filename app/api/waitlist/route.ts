import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Public endpoint — uses anon key, RLS allows insert
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  const body = await request.json()
  const { email, name, city, goal, referred_by } = body

  if (!email || !name) {
    return NextResponse.json({ error: 'email and name are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('waitlist')
    .insert({ email, name, city, goal, referred_by: referred_by ?? null })
    .select('position')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already on waitlist' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // TODO: trigger send-waitlist-email Edge Function once Resend is configured

  return NextResponse.json({ success: true, position: data.position })
}
