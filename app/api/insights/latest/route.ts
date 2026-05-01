import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: insight } = await supabase
    .from('insights')
    .select('id, type, content, period_start, period_end, created_at, model_used')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!insight) return NextResponse.json({ insight: null })
  return NextResponse.json({ insight })
}
