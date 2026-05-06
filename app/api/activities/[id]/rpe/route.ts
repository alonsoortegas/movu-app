import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { rpe } = await request.json()

  if (!Number.isInteger(rpe) || rpe < 1 || rpe > 10) {
    return NextResponse.json({ error: 'RPE must be an integer between 1 and 10' }, { status: 400 })
  }

  const { error } = await supabase
    .from('activities')
    .update({ rpe })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
