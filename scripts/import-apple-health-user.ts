import { createClient } from '@supabase/supabase-js'
import { parseAppleHealthExport } from '../lib/apple-health/parser'
import { normalizeDailyMetrics, normalizeSleep, normalizeWorkouts } from '../lib/apple-health/normalize'

const [, , email, filePath] = process.argv

if (!email || !filePath) {
  console.error('Usage: tsx scripts/import-apple-health-user.ts <email> <apple-health-export.xml>')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function insertInBatches(table: string, rows: Record<string, unknown>[], batchSize = 500) {
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).insert(batch)
    if (error) throw new Error(`${table} insert failed: ${error.message}`)
  }
}

async function main() {
  const { data: userPage, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) throw new Error(usersError.message)

  const user = userPage.users.find((candidate) => candidate.email === email)
  if (!user) throw new Error(`No Supabase auth user found for ${email}`)

  console.log(`Parsing ${filePath}`)
  const { workouts, sleepRecords, dailySummaries } = await parseAppleHealthExport(filePath)
  console.log(`Parsed workouts=${workouts.length}, sleepRecords=${sleepRecords.length}, dailySummaries=${dailySummaries.size}`)

  const activityRows = normalizeWorkouts(workouts, user.id).map((row) => ({
    ...row,
    start_date_utc: row.start_date_utc instanceof Date ? row.start_date_utc.toISOString() : row.start_date_utc,
    start_date_local: row.start_date_local instanceof Date ? row.start_date_local.toISOString() : row.start_date_local,
  })) as Record<string, unknown>[]

  const sleepRows = normalizeSleep(sleepRecords, user.id, dailySummaries) as unknown as Record<string, unknown>[]
  const metricRows = normalizeDailyMetrics(dailySummaries, user.id) as unknown as Record<string, unknown>[]

  if (activityRows.length > 0) {
    const dates = activityRows.map((row) => row.start_date_utc as string)
    const minDate = dates.reduce((a, b) => (a < b ? a : b))
    const maxDate = dates.reduce((a, b) => (a > b ? a : b))

    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('user_id', user.id)
      .eq('source', 'apple_health')
      .gte('start_date_utc', minDate)
      .lte('start_date_utc', maxDate)

    if (error) throw new Error(`activities delete failed: ${error.message}`)
    await insertInBatches('activities', activityRows)
  }

  if (sleepRows.length > 0) {
    const { error } = await supabase
      .from('sleep_logs')
      .upsert(sleepRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) throw new Error(`sleep_logs upsert failed: ${error.message}`)
  }

  if (metricRows.length > 0) {
    const { error } = await supabase
      .from('daily_metrics')
      .upsert(metricRows, { onConflict: 'user_id,date', ignoreDuplicates: false })
    if (error) throw new Error(`daily_metrics upsert failed: ${error.message}`)
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({ data_source: 'apple_health' })
    .eq('id', user.id)
  if (profileError) throw new Error(`profile update failed: ${profileError.message}`)

  console.log(JSON.stringify({
    user: { id: user.id, email: user.email },
    synced: {
      activities: activityRows.length,
      sleep: sleepRows.length,
      daily_metrics: metricRows.length,
    },
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
