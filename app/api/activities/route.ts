import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const to = searchParams.get('to') ?? new Date().toISOString()
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const { data: activities, count } = await supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .gte('start_date_utc', from)
    .lte('start_date_utc', to)
    .order('start_date_utc', { ascending: false })
    .range(offset, offset + limit - 1)

  // Aggregate HR zones across the period
  const zoneSummary = (activities ?? []).reduce(
    (acc, a) => {
      if (!a.hr_zones) return acc
      const z = a.hr_zones as Record<string, number>
      acc.z1_s += z.z1_s ?? 0
      acc.z2_s += z.z2_s ?? 0
      acc.z3_s += z.z3_s ?? 0
      acc.z4_s += z.z4_s ?? 0
      acc.z5_s += z.z5_s ?? 0
      acc.total_moving_time_s += a.moving_time_s ?? 0
      return acc
    },
    { z1_s: 0, z2_s: 0, z3_s: 0, z4_s: 0, z5_s: 0, total_moving_time_s: 0 }
  )

  return NextResponse.json({ activities, total: count, zone_summary: zoneSummary })
}
