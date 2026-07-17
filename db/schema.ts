import {
  pgTable,
  uuid,
  text,
  integer,
  serial,
  boolean,
  timestamp,
  bigint,
  real,
  jsonb,
  date,
} from 'drizzle-orm/pg-core'

// ---------- waitlist ----------
export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name'),
  city: text('city'),
  goal: text('goal'),
  referred_by: text('referred_by'),
  position: serial('position').notNull(),
  status: text('status').notNull().default('waiting'),
  invited_at: timestamp('invited_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- user_profiles ----------
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),
  full_name: text('full_name'),
  city: text('city'),
  sex: text('sex'),
  goal: text('goal'),
  max_hr_bpm: integer('max_hr_bpm'),
  weight_kg: real('weight_kg'),
  height_m: real('height_m'),
  data_source: text('data_source'),
  healthkit_last_sync_at: timestamp('healthkit_last_sync_at', { withTimezone: true }),
  whoop_user_id: bigint('whoop_user_id', { mode: 'number' }),
  whoop_access_token: text('whoop_access_token'),
  whoop_refresh_token: text('whoop_refresh_token'),
  whoop_token_expires: timestamp('whoop_token_expires', { withTimezone: true }),
  invite_code_used: text('invite_code_used'),
  onboarding_complete: boolean('onboarding_complete').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- invite_codes ----------
export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  created_by: uuid('created_by').references(() => userProfiles.id),
  max_uses: integer('max_uses').notNull().default(1),
  uses_count: integer('uses_count').notNull().default(0),
  expires_at: timestamp('expires_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  note: text('note'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- activities ----------
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  whoop_activity_id: uuid('whoop_activity_id').unique(),
  source: text('source').notNull().default('manual'),
  activity_type: text('activity_type'),
  activity_category: text('activity_category'),
  activity_name: text('activity_name'),
  start_date_utc: timestamp('start_date_utc', { withTimezone: true }),
  start_date_local: timestamp('start_date_local', { withTimezone: false }),
  timezone: text('timezone'),
  moving_time_s: integer('moving_time_s'),
  elapsed_time_s: integer('elapsed_time_s'),
  distance_m: real('distance_m'),
  elevation_gain_m: real('elevation_gain_m'),
  avg_hr_bpm: real('avg_hr_bpm'),
  max_hr_bpm: real('max_hr_bpm'),
  avg_pace_per_km_s: real('avg_pace_per_km_s'),
  avg_cadence_spm: real('avg_cadence_spm'),
  strain: real('strain'),
  calories_kcal: real('calories_kcal'),
  rpe: integer('rpe'),
  inferred_muscle_groups: text('inferred_muscle_groups').array(),
  hr_zones: jsonb('hr_zones'),
  trainer: boolean('trainer'),
  coach_name: text('coach_name'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- sleep_logs ----------
export const sleepLogs = pgTable('sleep_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  hours: real('hours'),
  quality: integer('quality'),
  source: text('source').notNull().default('manual'),
  notes: text('notes'),
  whoop_sleep_id: uuid('whoop_sleep_id').unique(),
  performance_pct: real('performance_pct'),
  consistency_pct: real('consistency_pct'),
  efficiency_pct: real('efficiency_pct'),
  respiratory_rate: real('respiratory_rate'),
  rem_hours: real('rem_hours'),
  deep_hours: real('deep_hours'),
  light_hours: real('light_hours'),
  awake_hours: real('awake_hours'),
  cycle_count: integer('cycle_count'),
  disturbance_count: integer('disturbance_count'),
  sleep_needed_baseline_h: real('sleep_needed_baseline_h'),
  sleep_needed_debt_h: real('sleep_needed_debt_h'),
  sleep_needed_strain_h: real('sleep_needed_strain_h'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- body_measurements ----------
export const bodyMeasurements = pgTable('body_measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  measured_at: date('measured_at').notNull(),
  weight_kg: real('weight_kg'),
  muscle_mass_kg: real('muscle_mass_kg'),
  fat_mass_kg: real('fat_mass_kg'),
  fat_percentage: real('fat_percentage'),
  visceral_fat_level: real('visceral_fat_level'),
  bmr_kcal: real('bmr_kcal'),
  phase_angle: real('phase_angle'),
  total_body_water_l: real('total_body_water_l'),
  protein_kg: real('protein_kg'),
  mineral_kg: real('mineral_kg'),
  waist_hip_ratio: real('waist_hip_ratio'),
  muscle_left_arm: real('muscle_left_arm'),
  muscle_right_arm: real('muscle_right_arm'),
  muscle_left_leg: real('muscle_left_leg'),
  muscle_right_leg: real('muscle_right_leg'),
  muscle_trunk: real('muscle_trunk'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- daily_metrics ----------
export const dailyMetrics = pgTable('daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  whoop_cycle_id: bigint('whoop_cycle_id', { mode: 'number' }),
  recovery_score: real('recovery_score'),
  hrv_ms: real('hrv_ms'),
  resting_hr_bpm: real('resting_hr_bpm'),
  spo2_pct: real('spo2_pct'),
  skin_temp_c: real('skin_temp_c'),
  daily_strain: real('daily_strain'),
  daily_avg_hr: real('daily_avg_hr'),
  daily_max_hr: real('daily_max_hr'),
  total_calories_kcal: real('total_calories_kcal'),
  active_min: integer('active_min'),
  steps_count: integer('steps_count'),
  is_on_period: boolean('is_on_period'),
  vo2_max: real('vo2_max'),
  physical_effort: real('physical_effort'),
  source: text('source').notNull().default('whoop'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- insights ----------
export const insights = pgTable('insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  period_start: date('period_start'),
  period_end: date('period_end'),
  type: text('type'),
  content: text('content'),
  model_used: text('model_used'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- Inferred types ----------
export type Waitlist = typeof waitlist.$inferSelect
export type NewWaitlist = typeof waitlist.$inferInsert
export type UserProfile = typeof userProfiles.$inferSelect
export type NewUserProfile = typeof userProfiles.$inferInsert
export type InviteCode = typeof inviteCodes.$inferSelect
export type NewInviteCode = typeof inviteCodes.$inferInsert
export type Activity = typeof activities.$inferSelect
export type NewActivity = typeof activities.$inferInsert
export type SleepLog = typeof sleepLogs.$inferSelect
export type NewSleepLog = typeof sleepLogs.$inferInsert
export type DailyMetric = typeof dailyMetrics.$inferSelect
export type NewDailyMetric = typeof dailyMetrics.$inferInsert
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert
export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert

// ---------- Union types for constrained text columns ----------
export type ActivityCategory = 'run' | 'ride' | 'strength' | 'hiit' | 'mobility' | 'walk' | 'swim' | 'other'
export type ActivitySource = 'manual' | 'whoop' | 'apple_health'
export type WaitlistStatus = 'waiting' | 'invited' | 'converted'
export type InsightType = 'weekly_summary' | 'recovery_alert' | 'plan_suggestion'
