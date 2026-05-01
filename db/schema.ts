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
  goal: text('goal'),
  max_hr_bpm: integer('max_hr_bpm'),
  weight_kg: real('weight_kg'),
  strava_athlete_id: integer('strava_athlete_id'),
  strava_access_token: text('strava_access_token'),
  strava_refresh_token: text('strava_refresh_token'),
  strava_token_expires: timestamp('strava_token_expires', { withTimezone: true }),
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
  strava_id: bigint('strava_id', { mode: 'number' }).unique(),
  source: text('source').notNull().default('strava'),
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
  rpe: integer('rpe'),
  inferred_muscle_groups: text('inferred_muscle_groups').array(),
  hr_zones: jsonb('hr_zones'),
  trainer: boolean('trainer'),
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
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- body_measurements ----------
export const bodyMeasurements = pgTable('body_measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  measured_at: timestamp('measured_at', { withTimezone: true }).notNull(),
  weight_kg: real('weight_kg'),
  muscle_mass_kg: real('muscle_mass_kg'),
  fat_mass_kg: real('fat_mass_kg'),
  fat_percentage: real('fat_percentage'),
  muscle_left_arm: real('muscle_left_arm'),
  muscle_right_arm: real('muscle_right_arm'),
  muscle_left_leg: real('muscle_left_leg'),
  muscle_right_leg: real('muscle_right_leg'),
  muscle_trunk: real('muscle_trunk'),
  notes: text('notes'),
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
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert
export type Insight = typeof insights.$inferSelect
export type NewInsight = typeof insights.$inferInsert

// ---------- Union types for constrained text columns ----------
export type ActivityCategory = 'run' | 'ride' | 'strength' | 'hiit' | 'mobility' | 'walk' | 'swim' | 'other'
export type ActivitySource = 'strava' | 'manual' | 'healthkit'
export type WaitlistStatus = 'waiting' | 'invited' | 'converted'
export type InsightType = 'weekly_summary' | 'recovery_alert' | 'plan_suggestion'
