import * as fs from 'fs'
import * as path from 'path'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, sql } from 'drizzle-orm'
import { activities, sleepLogs, dailyMetrics, userProfiles } from '../db/schema'
import {
  normalizeWhoopWorkout,
  normalizeWhoopSleep,
  normalizeWhoopCycle,
  type WhoopWorkout,
  type WhoopSleep,
  type WhoopCycle,
} from '../lib/whoop/normalize'

// Load .env.local into process.env
const envFile = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

type Dump = {
  user_profile: { user_id: number; email: string; first_name: string; last_name: string }
  body_measurement: { height_meter: number; weight_kilogram: number; max_heart_rate: number }
  workouts: WhoopWorkout[]
  sleep: WhoopSleep[]
  cycles: WhoopCycle[]
}

async function main() {
  const userId = process.env.WHOOP_SUPABASE_USER_ID
  if (!userId) {
    console.error('Missing WHOOP_SUPABASE_USER_ID in .env.local')
    process.exit(1)
  }

  const dumpPath = path.resolve(process.cwd(), 'whoop-data-dump.json')
  if (!fs.existsSync(dumpPath)) {
    console.error('whoop-data-dump.json not found — run npm run whoop:explore first')
    process.exit(1)
  }

  const dump: Dump = JSON.parse(fs.readFileSync(dumpPath, 'utf-8'))
  const db = drizzle(postgres(process.env.DATABASE_URL!))

  // 1. Update user_profile body measurement data
  const bm = dump.body_measurement
  if (bm) {
    await db
      .update(userProfiles)
      .set({
        height_m: bm.height_meter,
        weight_kg: bm.weight_kilogram,
        max_hr_bpm: bm.max_heart_rate,
        whoop_user_id: dump.user_profile?.user_id ?? null,
      })
      .where(eq(userProfiles.id, userId))
    console.log('✓ Updated user_profiles with body measurement data')
  }

  // 2. Upsert workouts → activities
  const workoutRows = (dump.workouts ?? [])
    .map((w) => normalizeWhoopWorkout(w, userId))
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (workoutRows.length > 0) {
    await db
      .insert(activities)
      .values(workoutRows)
      .onConflictDoUpdate({
        target: activities.whoop_activity_id,
        set: {
          strain: sql`excluded.strain`,
          calories_kcal: sql`excluded.calories_kcal`,
          avg_hr_bpm: sql`excluded.avg_hr_bpm`,
          max_hr_bpm: sql`excluded.max_hr_bpm`,
          hr_zones: sql`excluded.hr_zones`,
          elapsed_time_s: sql`excluded.elapsed_time_s`,
          moving_time_s: sql`excluded.moving_time_s`,
        },
      })
    console.log(`✓ Upserted ${workoutRows.length} workouts into activities`)
  } else {
    console.log('  No scored workouts to upsert')
  }

  // 3. Upsert sleep → sleep_logs
  const sleepRows = (dump.sleep ?? [])
    .map((s) => normalizeWhoopSleep(s, userId))
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (sleepRows.length > 0) {
    await db
      .insert(sleepLogs)
      .values(sleepRows)
      .onConflictDoUpdate({
        target: sleepLogs.whoop_sleep_id,
        set: {
          hours: sql`excluded.hours`,
          performance_pct: sql`excluded.performance_pct`,
          consistency_pct: sql`excluded.consistency_pct`,
          efficiency_pct: sql`excluded.efficiency_pct`,
          respiratory_rate: sql`excluded.respiratory_rate`,
          rem_hours: sql`excluded.rem_hours`,
          deep_hours: sql`excluded.deep_hours`,
          light_hours: sql`excluded.light_hours`,
          awake_hours: sql`excluded.awake_hours`,
        },
      })
    console.log(`✓ Upserted ${sleepRows.length} sleep records into sleep_logs`)
  } else {
    console.log('  No scored sleep records to upsert')
  }

  // 4. Upsert cycles → daily_metrics
  const cycleRows = (dump.cycles ?? [])
    .map((c) => normalizeWhoopCycle(c, userId))
    .filter((r): r is NonNullable<typeof r> => r !== null)

  if (cycleRows.length > 0) {
    await db
      .insert(dailyMetrics)
      .values(cycleRows)
      .onConflictDoUpdate({
        target: [dailyMetrics.user_id, dailyMetrics.date],
        set: {
          daily_strain: sql`excluded.daily_strain`,
          total_calories_kcal: sql`excluded.total_calories_kcal`,
          daily_avg_hr: sql`excluded.daily_avg_hr`,
          daily_max_hr: sql`excluded.daily_max_hr`,
          whoop_cycle_id: sql`excluded.whoop_cycle_id`,
        },
      })
    console.log(`✓ Upserted ${cycleRows.length} cycles into daily_metrics`)
  } else {
    console.log('  No scored cycles to upsert')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
