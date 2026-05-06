import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getISOWeekBounds } from '@/lib/dates'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekStart, weekEnd } = getISOWeekBounds()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: activities }, { data: sleepLogs }, { data: todaySleep }] = await Promise.all([
    supabase
      .from('activities')
      .select('moving_time_s, distance_m, hr_zones, rpe, activity_category, start_date_utc')
      .eq('user_id', user.id)
      .gte('start_date_utc', weekStart)
      .lte('start_date_utc', weekEnd),
    supabase
      .from('sleep_logs')
      .select('hours, quality')
      .eq('user_id', user.id)
      .gte('date', weekStart.split('T')[0])
      .lte('date', today),
    supabase
      .from('sleep_logs')
      .select('hours, quality, notes')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle(),
  ])

  const acts = activities ?? []
  const totalMovingTimeS = acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0)
  const totalDistanceM = acts.reduce((s, a) => s + (a.distance_m ?? 0), 0)

  const zones = acts.reduce(
    (acc, a) => {
      if (!a.hr_zones) return acc
      const z = a.hr_zones as Record<string, number>
      acc.z1 += z.z1_s ?? 0
      acc.z2 += z.z2_s ?? 0
      acc.z3 += z.z3_s ?? 0
      acc.z4 += z.z4_s ?? 0
      acc.z5 += z.z5_s ?? 0
      return acc
    },
    { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 }
  )
  const totalZoneS = Object.values(zones).reduce((s, v) => s + v, 0)
  const zoneDistribution = totalZoneS > 0
    ? {
        z1_pct: Math.round((zones.z1 / totalZoneS) * 100),
        z2_pct: Math.round((zones.z2 / totalZoneS) * 100),
        z3_pct: Math.round((zones.z3 / totalZoneS) * 100),
        z4_pct: Math.round((zones.z4 / totalZoneS) * 100),
        z5_pct: Math.round((zones.z5 / totalZoneS) * 100),
      }
    : null

  const loadScore = acts.reduce((s, a) => {
    if (!a.rpe || !a.moving_time_s) return s
    return s + Math.round((a.moving_time_s / 60) * a.rpe)
  }, 0)

  const sleepArr = sleepLogs ?? []
  const avgSleepHours =
    sleepArr.length > 0
      ? sleepArr.reduce((s, l) => s + (l.hours ?? 0), 0) / sleepArr.length
      : null
  const sleepQualityAvg =
    sleepArr.length > 0
      ? sleepArr.reduce((s, l) => s + (l.quality ?? 0), 0) / sleepArr.length
      : null

  return NextResponse.json({
    week: {
      total_activities: acts.length,
      total_moving_time_s: totalMovingTimeS,
      total_distance_m: totalDistanceM,
      zone_distribution: zoneDistribution,
      load_score: loadScore,
      avg_sleep_hours: avgSleepHours ? Math.round(avgSleepHours * 10) / 10 : null,
      sleep_quality_avg: sleepQualityAvg ? Math.round(sleepQualityAvg * 10) / 10 : null,
    },
    today: {
      sleep_last_night: todaySleep ?? null,
    },
  })
}
