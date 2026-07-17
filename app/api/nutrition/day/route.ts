import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DAY_TYPES = ['hard', 'moderate', 'rest']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// GET /api/nutrition/day?date=YYYY-MM-DD → { day, mealLogs, items }
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date=YYYY-MM-DD is required' }, { status: 400 })
  }

  const [dayResult, logsResult] = await Promise.all([
    supabase.from('nutrition_days').select('*').eq('user_id', user.id).eq('date', date).maybeSingle(),
    supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('date', date).order('logged_at'),
  ])
  if (dayResult.error) return NextResponse.json({ error: dayResult.error.message }, { status: 500 })
  if (logsResult.error) return NextResponse.json({ error: logsResult.error.message }, { status: 500 })

  const mealLogs = logsResult.data ?? []
  let items: unknown[] = []
  if (mealLogs.length) {
    const { data: itemRows, error: itemsError } = await supabase
      .from('meal_log_items')
      .select('*')
      .in('meal_log_id', mealLogs.map((m) => m.id))
      .order('created_at')
    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })
    items = itemRows ?? []
  }

  return NextResponse.json({ day: dayResult.data, mealLogs, items })
}

// PUT { date, day_type } → upsert the day's type.
export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { date, day_type } = body
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 })
  }
  if (!DAY_TYPES.includes(day_type)) {
    return NextResponse.json({ error: 'day_type must be hard, moderate, or rest' }, { status: 400 })
  }

  const { data: day, error } = await supabase
    .from('nutrition_days')
    .upsert({ user_id: user.id, date, day_type }, { onConflict: 'user_id,date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ day })
}
