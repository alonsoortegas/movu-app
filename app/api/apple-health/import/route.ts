import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAppleHealthExport } from '@/lib/apple-health/parser'
import { normalizeWorkouts, normalizeSleep, normalizeDailyMetrics } from '@/lib/apple-health/normalize'
import { NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { Database } from '@/types/database'

type ActivityInsert = Database['public']['Tables']['activities']['Insert']
type SleepInsert = Database['public']['Tables']['sleep_logs']['Insert']
type MetricInsert = Database['public']['Tables']['daily_metrics']['Insert']

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
  }

  const MAX_BYTES = 500 * 1024 * 1024 // 500 MB
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 500 MB)' }, { status: 413 })
  }

  // Write to a temp file so the streaming parser can use a file path.
  const tmpPath = join(tmpdir(), `apple-health-${randomUUID()}.xml`)
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tmpPath, buffer)
  } catch {
    return NextResponse.json({ error: 'Failed to stage upload' }, { status: 500 })
  }

  let parsed
  try {
    parsed = await parseAppleHealthExport(tmpPath)
  } catch (err) {
    console.error('[apple-health/import] parse failed:', err)
    return NextResponse.json({ error: 'Failed to parse export file' }, { status: 422 })
  } finally {
    await unlink(tmpPath).catch(() => null)
  }

  const { workouts, sleepRecords, dailySummaries } = parsed
  const admin = createAdminClient()

  // ── Activities ───────────────────────────────────────────────────────────────
  // No unique key for Apple Health activities — delete then re-insert to avoid
  // duplicates on repeated uploads of overlapping exports.
  const activityRows = normalizeWorkouts(workouts, user.id).map(r => ({
    ...r,
    start_date_utc: r.start_date_utc instanceof Date ? r.start_date_utc.toISOString() : r.start_date_utc,
    start_date_local: r.start_date_local instanceof Date ? r.start_date_local.toISOString() : r.start_date_local,
  })) as unknown as ActivityInsert[]
  let activitiesCount = 0

  if (activityRows.length > 0) {
    const dates = activityRows.map(r => r.start_date_utc as string)
    const minDate = dates.reduce((a, b) => (a < b ? a : b))
    const maxDate = dates.reduce((a, b) => (a > b ? a : b))

    const { error: delErr } = await admin
      .from('activities')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'apple_health')
      .gte('start_date_utc', minDate)
      .lte('start_date_utc', maxDate)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    const { error: insErr } = await admin.from('activities').insert(activityRows)
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    activitiesCount = activityRows.length
  }

  // ── Sleep ────────────────────────────────────────────────────────────────────
  // normalizeSleep deduplicates by date internally (keeps the most-hours record).
  const sleepRows = normalizeSleep(sleepRecords, user.id, dailySummaries) as unknown as SleepInsert[]
  let sleepCount = 0

  if (sleepRows.length > 0) {
    const { error } = await admin
      .from('sleep_logs')
      .upsert(sleepRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sleepCount = sleepRows.length
  }

  // ── Daily metrics ────────────────────────────────────────────────────────────
  const metricRows = normalizeDailyMetrics(dailySummaries, user.id) as unknown as MetricInsert[]
  let metricsCount = 0

  if (metricRows.length > 0) {
    const { error } = await admin
      .from('daily_metrics')
      .upsert(metricRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    metricsCount = metricRows.length
  }

  await admin
    .from('user_profiles')
    .update({ data_source: 'apple_health' })
    .eq('id', user.id)

  return NextResponse.json({
    synced: {
      activities: activitiesCount,
      sleep: sleepCount,
      daily_metrics: metricsCount,
    },
  })
}
