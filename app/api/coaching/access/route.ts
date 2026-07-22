import { NextResponse } from 'next/server'
import { normalizeCoachInviteEmail } from '@/lib/coaching/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: grants, error } = await supabase
    .from('coach_client_access')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const coachIds = [...new Set((grants ?? []).map((grant) => grant.coach_id))]
  const admin = createAdminClient()
  const { data: coaches } = coachIds.length
    ? await admin
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', coachIds)
    : { data: [] }
  const coachById = new Map((coaches ?? []).map((coach) => [coach.id, coach]))

  return NextResponse.json({
    grants: (grants ?? []).map((grant) => ({
      ...grant,
      coach: coachById.get(grant.coach_id) ?? null,
    })),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const email = normalizeCoachInviteEmail(body.email)
    const admin = createAdminClient()
    const { data: coach } = await admin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .eq('account_role', 'coach')
      .maybeSingle()

    if (!coach) {
      return NextResponse.json({ error: 'No eligible coach found for that email' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const { data: grant, error } = await supabase
      .from('coach_client_access')
      .upsert(
        {
          client_id: user.id,
          coach_id: coach.id,
          status: 'active',
          granted_at: now,
          revoked_at: null,
          updated_at: now,
        },
        { onConflict: 'client_id,coach_id' },
      )
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ grant }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid coach email' },
      { status: 400 },
    )
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (typeof body.id !== 'string') {
    return NextResponse.json({ error: 'Grant id is required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const { data: grant, error } = await supabase
    .from('coach_client_access')
    .update({ status: 'revoked', revoked_at: now, updated_at: now })
    .eq('id', body.id)
    .eq('client_id', user.id)
    .select()
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!grant) return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  return NextResponse.json({ grant })
}
