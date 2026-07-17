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

// ---------- workout_plans (lifeos port) ----------
export const workoutPlans = pgTable('workout_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  start_date: date('start_date').notNull(),
  weeks: integer('weeks').notNull(),
  active: boolean('active').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- workout_plan_sessions ----------
export const workoutPlanSessions = pgTable('workout_plan_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  plan_id: uuid('plan_id')
    .notNull()
    .references(() => workoutPlans.id, { onDelete: 'cascade' }),
  week_number: integer('week_number').notNull(),
  day_of_week: text('day_of_week').notNull(),
  title: text('title').notNull(),
  session_type: text('session_type').notNull().default('strength'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- workout_plan_exercises ----------
export const workoutPlanExercises = pgTable('workout_plan_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  session_id: uuid('session_id')
    .notNull()
    .references(() => workoutPlanSessions.id, { onDelete: 'cascade' }),
  order_index: integer('order_index').notNull().default(0),
  exercise_name: text('exercise_name').notNull(),
  prescribed_sets: integer('prescribed_sets'),
  prescribed_reps: text('prescribed_reps'),
  prescribed_weight_kg: real('prescribed_weight_kg'),
  target_rpe: text('target_rpe'),
  superset_group: integer('superset_group'),
  rest_seconds: integer('rest_seconds'),
  is_isometric: boolean('is_isometric').notNull().default(false),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- workout_set_logs ----------
export const workoutSetLogs = pgTable('workout_set_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  exercise_id: uuid('exercise_id').references(() => workoutPlanExercises.id, {
    onDelete: 'set null',
  }),
  exercise_name: text('exercise_name').notNull(),
  set_number: integer('set_number'),
  weight_kg: real('weight_kg'),
  reps: integer('reps'),
  rpe: real('rpe'),
  notes: text('notes'),
  logged_at: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- food_items ----------
export const foodItems = pgTable('food_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  portion_label: text('portion_label').notNull(),
  grams: real('grams'),
  calories: integer('calories').notNull().default(0),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  tracking_unit: text('tracking_unit').notNull().default('grams'),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- saved_food_portions ----------
export const savedFoodPortions = pgTable('saved_food_portions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  normalized_name: text('normalized_name').notNull(),
  name: text('name').notNull(),
  calories: integer('calories').notNull().default(0),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- food_substitution_groups ----------
export const foodSubstitutionGroups = pgTable('food_substitution_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  macro_type: text('macro_type').notNull(),
  target_macro_g: real('target_macro_g').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- food_substitution_group_items ----------
export const foodSubstitutionGroupItems = pgTable('food_substitution_group_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  group_id: uuid('group_id')
    .notNull()
    .references(() => foodSubstitutionGroups.id, { onDelete: 'cascade' }),
  food_item_id: uuid('food_item_id')
    .notNull()
    .references(() => foodItems.id, { onDelete: 'cascade' }),
  quantity: real('quantity').notNull().default(1),
  label: text('label').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- nutrition_targets ----------
export const nutritionTargets = pgTable('nutrition_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  day_type: text('day_type').notNull(),
  calories_target: integer('calories_target').notNull(),
  protein_target: integer('protein_target').notNull(),
  carbs_target: integer('carbs_target').notNull(),
  fat_target: integer('fat_target').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- nutrition_days ----------
export const nutritionDays = pgTable('nutrition_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  day_type: text('day_type').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- meal_logs ----------
export const mealLogs = pgTable('meal_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  meal_name: text('meal_name').notNull(),
  logged_at: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),
})

// ---------- meal_log_items ----------
export const mealLogItems = pgTable('meal_log_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  meal_log_id: uuid('meal_log_id')
    .notNull()
    .references(() => mealLogs.id, { onDelete: 'cascade' }),
  food_item_id: uuid('food_item_id').references(() => foodItems.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(1),
  calories: integer('calories').notNull().default(0),
  protein_g: real('protein_g').notNull().default(0),
  carbs_g: real('carbs_g').notNull().default(0),
  fat_g: real('fat_g').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- training_phases ----------
export const trainingPhases = pgTable('training_phases', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => userProfiles.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),
  target_rate_kg_per_week: real('target_rate_kg_per_week'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ---------- Inferred types (lifeos port) ----------
export type WorkoutPlan = typeof workoutPlans.$inferSelect
export type NewWorkoutPlan = typeof workoutPlans.$inferInsert
export type WorkoutPlanSession = typeof workoutPlanSessions.$inferSelect
export type NewWorkoutPlanSession = typeof workoutPlanSessions.$inferInsert
export type WorkoutPlanExercise = typeof workoutPlanExercises.$inferSelect
export type NewWorkoutPlanExercise = typeof workoutPlanExercises.$inferInsert
export type WorkoutSetLog = typeof workoutSetLogs.$inferSelect
export type NewWorkoutSetLog = typeof workoutSetLogs.$inferInsert
export type FoodItem = typeof foodItems.$inferSelect
export type NewFoodItem = typeof foodItems.$inferInsert
export type SavedFoodPortion = typeof savedFoodPortions.$inferSelect
export type NewSavedFoodPortion = typeof savedFoodPortions.$inferInsert
export type FoodSubstitutionGroup = typeof foodSubstitutionGroups.$inferSelect
export type NewFoodSubstitutionGroup = typeof foodSubstitutionGroups.$inferInsert
export type FoodSubstitutionGroupItem = typeof foodSubstitutionGroupItems.$inferSelect
export type NewFoodSubstitutionGroupItem = typeof foodSubstitutionGroupItems.$inferInsert
export type NutritionTarget = typeof nutritionTargets.$inferSelect
export type NewNutritionTarget = typeof nutritionTargets.$inferInsert
export type NutritionDay = typeof nutritionDays.$inferSelect
export type NewNutritionDay = typeof nutritionDays.$inferInsert
export type MealLog = typeof mealLogs.$inferSelect
export type NewMealLog = typeof mealLogs.$inferInsert
export type MealLogItem = typeof mealLogItems.$inferSelect
export type NewMealLogItem = typeof mealLogItems.$inferInsert
export type TrainingPhaseRow = typeof trainingPhases.$inferSelect
export type NewTrainingPhase = typeof trainingPhases.$inferInsert

// ---------- Union types for constrained text columns ----------
export type ActivityCategory = 'run' | 'ride' | 'strength' | 'hiit' | 'mobility' | 'walk' | 'swim' | 'other'
export type ActivitySource = 'manual' | 'whoop' | 'apple_health'
export type WaitlistStatus = 'waiting' | 'invited' | 'converted'
export type InsightType = 'weekly_summary' | 'recovery_alert' | 'plan_suggestion'
export type SessionType = 'strength' | 'activation' | 'cardio' | 'other'
export type FoodCategory = 'protein' | 'carb' | 'fat' | 'mixed' | 'veg'
export type TrackingUnit = 'piece' | 'cup' | 'grams' | 'scoop' | 'slice'
export type MacroType = 'carb' | 'protein'
export type PhaseKindColumn = 'bulk' | 'cut' | 'maintenance'
