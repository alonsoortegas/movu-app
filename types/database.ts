// Re-export inferred types from Drizzle schema — single source of truth
export type {
  Waitlist as WaitlistRow,
  NewWaitlist,
  UserProfile as UserProfileRow,
  NewUserProfile,
  InviteCode as InviteCodeRow,
  NewInviteCode,
  Activity as ActivityRow,
  NewActivity,
  SleepLog as SleepLogRow,
  NewSleepLog,
  DailyMetric as DailyMetricRow,
  NewDailyMetric,
  BodyMeasurement as BodyMeasurementRow,
  NewBodyMeasurement,
  Insight as InsightRow,
  NewInsight,
  WorkoutPlan as WorkoutPlanRow,
  NewWorkoutPlan,
  WorkoutPlanSession as WorkoutPlanSessionRow,
  NewWorkoutPlanSession,
  WorkoutPlanExercise as WorkoutPlanExerciseRow,
  NewWorkoutPlanExercise,
  WorkoutSetLog as WorkoutSetLogRow,
  NewWorkoutSetLog,
  FoodItem as FoodItemRow,
  NewFoodItem,
  SavedFoodPortion as SavedFoodPortionRow,
  NewSavedFoodPortion,
  FoodSubstitutionGroup as FoodSubstitutionGroupRow,
  NewFoodSubstitutionGroup,
  FoodSubstitutionGroupItem as FoodSubstitutionGroupItemRow,
  NewFoodSubstitutionGroupItem,
  NutritionTarget as NutritionTargetRow,
  NewNutritionTarget,
  NutritionDay as NutritionDayRow,
  NewNutritionDay,
  MealLog as MealLogRow,
  NewMealLog,
  MealLogItem as MealLogItemRow,
  NewMealLogItem,
  TrainingPhaseRow,
  NewTrainingPhase,
  ActivityCategory,
  ActivitySource,
  WaitlistStatus,
  InsightType,
  SessionType,
  FoodCategory,
  TrackingUnit,
  MacroType,
  PhaseKindColumn,
} from '@/db/schema'

// HrZones type (used in hr_zones jsonb field)
export type HrZones = {
  z0_min?: number
  z1_min?: number
  z2_min?: number
  z3_min?: number
  z4_min?: number
  z5_min?: number
  z1_s?: number
  z2_s?: number
  z3_s?: number
  z4_s?: number
  z5_s?: number
}

// Keep Json type for Supabase client generics
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// Supabase client Database type — needed for createClient<Database>()
// Row types here reference the Drizzle-inferred types via re-exports above
export type Database = {
  public: {
    Tables: {
      invite_codes: {
        Row: {
          id: string
          code: string
          created_by: string | null
          max_uses: number
          uses_count: number
          expires_at: string | null
          active: boolean
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          created_by?: string | null
          max_uses?: number
          uses_count?: number
          expires_at?: string | null
          active?: boolean
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          created_by?: string | null
          max_uses?: number
          uses_count?: number
          expires_at?: string | null
          active?: boolean
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          id: string
          email: string
          name: string | null
          city: string | null
          goal: string | null
          referred_by: string | null
          position: number
          status: string
          invited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          city?: string | null
          goal?: string | null
          referred_by?: string | null
          position?: number
          status?: string
          invited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          city?: string | null
          goal?: string | null
          referred_by?: string | null
          position?: number
          status?: string
          invited_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          email: string | null
          account_role: string
          nutrition_tracking_mode: string
          full_name: string | null
          city: string | null
          sex: string | null
          goal: string | null
          max_hr_bpm: number | null
          weight_kg: number | null
          height_m: number | null
          whoop_user_id: number | null
          whoop_access_token: string | null
          whoop_refresh_token: string | null
          whoop_token_expires: string | null
          data_source: string | null
          healthkit_last_sync_at: string | null
          invite_code_used: string | null
          onboarding_complete: boolean
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          account_role?: string
          nutrition_tracking_mode?: string
          full_name?: string | null
          city?: string | null
          sex?: string | null
          goal?: string | null
          max_hr_bpm?: number | null
          weight_kg?: number | null
          height_m?: number | null
          whoop_user_id?: number | null
          whoop_access_token?: string | null
          whoop_refresh_token?: string | null
          whoop_token_expires?: string | null
          data_source?: string | null
          healthkit_last_sync_at?: string | null
          invite_code_used?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          account_role?: string
          nutrition_tracking_mode?: string
          full_name?: string | null
          city?: string | null
          sex?: string | null
          goal?: string | null
          max_hr_bpm?: number | null
          weight_kg?: number | null
          height_m?: number | null
          whoop_user_id?: number | null
          whoop_access_token?: string | null
          whoop_refresh_token?: string | null
          whoop_token_expires?: string | null
          data_source?: string | null
          healthkit_last_sync_at?: string | null
          invite_code_used?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Relationships: []
      }
      coach_client_access: {
        Row: {
          id: string
          client_id: string
          coach_id: string
          status: string
          granted_at: string | null
          revoked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          coach_id: string
          status?: string
          granted_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          coach_id?: string
          status?: string
          granted_at?: string | null
          revoked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          user_id: string
          source: string
          activity_type: string | null
          activity_category: string | null
          activity_name: string | null
          start_date_utc: string | null
          start_date_local: string | null
          timezone: string | null
          moving_time_s: number | null
          elapsed_time_s: number | null
          distance_m: number | null
          elevation_gain_m: number | null
          avg_hr_bpm: number | null
          max_hr_bpm: number | null
          avg_pace_per_km_s: number | null
          avg_cadence_spm: number | null
          rpe: number | null
          inferred_muscle_groups: string[] | null
          hr_zones: Json | null
          trainer: boolean | null
          coach_name: string | null
          whoop_activity_id: string | null
          strain: number | null
          calories_kcal: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          source?: string
          activity_type?: string | null
          activity_category?: string | null
          activity_name?: string | null
          start_date_utc?: string | null
          start_date_local?: string | null
          timezone?: string | null
          moving_time_s?: number | null
          elapsed_time_s?: number | null
          distance_m?: number | null
          elevation_gain_m?: number | null
          avg_hr_bpm?: number | null
          max_hr_bpm?: number | null
          avg_pace_per_km_s?: number | null
          avg_cadence_spm?: number | null
          rpe?: number | null
          inferred_muscle_groups?: string[] | null
          hr_zones?: Json | null
          trainer?: boolean | null
          coach_name?: string | null
          whoop_activity_id?: string | null
          strain?: number | null
          calories_kcal?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          source?: string
          activity_type?: string | null
          activity_category?: string | null
          activity_name?: string | null
          start_date_utc?: string | null
          start_date_local?: string | null
          timezone?: string | null
          moving_time_s?: number | null
          elapsed_time_s?: number | null
          distance_m?: number | null
          elevation_gain_m?: number | null
          avg_hr_bpm?: number | null
          max_hr_bpm?: number | null
          avg_pace_per_km_s?: number | null
          avg_cadence_spm?: number | null
          rpe?: number | null
          inferred_muscle_groups?: string[] | null
          hr_zones?: Json | null
          trainer?: boolean | null
          coach_name?: string | null
          whoop_activity_id?: string | null
          strain?: number | null
          calories_kcal?: number | null
          created_at?: string
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          hours: number | null
          quality: number | null
          source: string
          notes: string | null
          whoop_sleep_id: string | null
          performance_pct: number | null
          consistency_pct: number | null
          efficiency_pct: number | null
          respiratory_rate: number | null
          rem_hours: number | null
          deep_hours: number | null
          light_hours: number | null
          awake_hours: number | null
          cycle_count: number | null
          disturbance_count: number | null
          sleep_needed_baseline_h: number | null
          sleep_needed_debt_h: number | null
          sleep_needed_strain_h: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          hours?: number | null
          quality?: number | null
          source?: string
          notes?: string | null
          whoop_sleep_id?: string | null
          performance_pct?: number | null
          consistency_pct?: number | null
          efficiency_pct?: number | null
          respiratory_rate?: number | null
          rem_hours?: number | null
          deep_hours?: number | null
          light_hours?: number | null
          awake_hours?: number | null
          cycle_count?: number | null
          disturbance_count?: number | null
          sleep_needed_baseline_h?: number | null
          sleep_needed_debt_h?: number | null
          sleep_needed_strain_h?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          hours?: number | null
          quality?: number | null
          source?: string
          notes?: string | null
          whoop_sleep_id?: string | null
          performance_pct?: number | null
          consistency_pct?: number | null
          efficiency_pct?: number | null
          respiratory_rate?: number | null
          rem_hours?: number | null
          deep_hours?: number | null
          light_hours?: number | null
          awake_hours?: number | null
          cycle_count?: number | null
          disturbance_count?: number | null
          sleep_needed_baseline_h?: number | null
          sleep_needed_debt_h?: number | null
          sleep_needed_strain_h?: number | null
          created_at?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          id: string
          user_id: string
          date: string
          whoop_cycle_id: number | null
          recovery_score: number | null
          hrv_ms: number | null
          resting_hr_bpm: number | null
          spo2_pct: number | null
          skin_temp_c: number | null
          daily_strain: number | null
          daily_avg_hr: number | null
          daily_max_hr: number | null
          total_calories_kcal: number | null
          active_min: number | null
          steps_count: number | null
          is_on_period: boolean | null
          vo2_max: number | null
          physical_effort: number | null
          source: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          whoop_cycle_id?: number | null
          recovery_score?: number | null
          hrv_ms?: number | null
          resting_hr_bpm?: number | null
          spo2_pct?: number | null
          skin_temp_c?: number | null
          daily_strain?: number | null
          daily_avg_hr?: number | null
          daily_max_hr?: number | null
          total_calories_kcal?: number | null
          active_min?: number | null
          steps_count?: number | null
          is_on_period?: boolean | null
          vo2_max?: number | null
          physical_effort?: number | null
          source?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          whoop_cycle_id?: number | null
          recovery_score?: number | null
          hrv_ms?: number | null
          resting_hr_bpm?: number | null
          spo2_pct?: number | null
          skin_temp_c?: number | null
          daily_strain?: number | null
          daily_avg_hr?: number | null
          daily_max_hr?: number | null
          total_calories_kcal?: number | null
          active_min?: number | null
          steps_count?: number | null
          is_on_period?: boolean | null
          vo2_max?: number | null
          physical_effort?: number | null
          source?: string
          created_at?: string
        }
        Relationships: []
      }
      body_measurements: {
        Row: {
          id: string
          user_id: string
          measured_at: string
          weight_kg: number | null
          muscle_mass_kg: number | null
          fat_mass_kg: number | null
          fat_percentage: number | null
          visceral_fat_level: number | null
          bmr_kcal: number | null
          phase_angle: number | null
          total_body_water_l: number | null
          protein_kg: number | null
          mineral_kg: number | null
          waist_hip_ratio: number | null
          muscle_left_arm: number | null
          muscle_right_arm: number | null
          muscle_left_leg: number | null
          muscle_right_leg: number | null
          muscle_trunk: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          measured_at: string
          weight_kg?: number | null
          muscle_mass_kg?: number | null
          fat_mass_kg?: number | null
          fat_percentage?: number | null
          visceral_fat_level?: number | null
          bmr_kcal?: number | null
          phase_angle?: number | null
          total_body_water_l?: number | null
          protein_kg?: number | null
          mineral_kg?: number | null
          waist_hip_ratio?: number | null
          muscle_left_arm?: number | null
          muscle_right_arm?: number | null
          muscle_left_leg?: number | null
          muscle_right_leg?: number | null
          muscle_trunk?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          measured_at?: string
          weight_kg?: number | null
          muscle_mass_kg?: number | null
          fat_mass_kg?: number | null
          fat_percentage?: number | null
          visceral_fat_level?: number | null
          bmr_kcal?: number | null
          phase_angle?: number | null
          total_body_water_l?: number | null
          protein_kg?: number | null
          mineral_kg?: number | null
          waist_hip_ratio?: number | null
          muscle_left_arm?: number | null
          muscle_right_arm?: number | null
          muscle_left_leg?: number | null
          muscle_right_leg?: number | null
          muscle_trunk?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          id: string
          user_id: string
          period_start: string | null
          period_end: string | null
          type: string | null
          content: string | null
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period_start?: string | null
          period_end?: string | null
          type?: string | null
          content?: string | null
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period_start?: string | null
          period_end?: string | null
          type?: string | null
          content?: string | null
          model_used?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          id: string
          user_id: string
          name: string
          start_date: string
          weeks: number
          active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          start_date: string
          weeks: number
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          start_date?: string
          weeks?: number
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_plan_sessions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          week_number: number
          day_of_week: string
          title: string
          session_type: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          week_number: number
          day_of_week: string
          title: string
          session_type?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          week_number?: number
          day_of_week?: string
          title?: string
          session_type?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_plan_exercises: {
        Row: {
          id: string
          user_id: string
          session_id: string
          order_index: number
          exercise_name: string
          prescribed_sets: number | null
          prescribed_reps: string | null
          prescribed_weight_kg: number | null
          target_rpe: string | null
          superset_group: number | null
          rest_seconds: number | null
          is_isometric: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          order_index?: number
          exercise_name: string
          prescribed_sets?: number | null
          prescribed_reps?: string | null
          prescribed_weight_kg?: number | null
          target_rpe?: string | null
          superset_group?: number | null
          rest_seconds?: number | null
          is_isometric?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          order_index?: number
          exercise_name?: string
          prescribed_sets?: number | null
          prescribed_reps?: string | null
          prescribed_weight_kg?: number | null
          target_rpe?: string | null
          superset_group?: number | null
          rest_seconds?: number | null
          is_isometric?: boolean
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      exercise_catalog: {
        Row: {
          id: string
          user_id: string | null
          slug: string
          name_es: string
          name_en: string
          name_de: string
          primary_muscle_group: string | null
          secondary_muscle_groups: string[]
          workout_types: string[]
          default_tracking: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          slug: string
          name_es: string
          name_en: string
          name_de: string
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[]
          workout_types?: string[]
          default_tracking?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          slug?: string
          name_es?: string
          name_en?: string
          name_de?: string
          primary_muscle_group?: string | null
          secondary_muscle_groups?: string[]
          workout_types?: string[]
          default_tracking?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      performed_workouts: {
        Row: {
          id: string
          user_id: string
          plan_session_id: string | null
          activity_id: string | null
          origin: string
          title: string
          workout_type: string
          performed_on: string
          started_at: string
          ended_at: string | null
          duration_min: number | null
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_session_id?: string | null
          activity_id?: string | null
          origin: string
          title: string
          workout_type: string
          performed_on: string
          started_at: string
          ended_at?: string | null
          duration_min?: number | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_session_id?: string | null
          activity_id?: string | null
          origin?: string
          title?: string
          workout_type?: string
          performed_on?: string
          started_at?: string
          ended_at?: string | null
          duration_min?: number | null
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      performed_workout_exercises: {
        Row: {
          id: string
          user_id: string
          performed_workout_id: string
          catalog_exercise_id: string | null
          exercise_name: string
          primary_muscle_group: string | null
          prescribed_sets: number | null
          prescribed_reps: string | null
          prescribed_weight_kg: number | null
          target_rpe: string | null
          target_rir: string | null
          rest_seconds: number | null
          order_index: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          performed_workout_id: string
          catalog_exercise_id?: string | null
          exercise_name: string
          primary_muscle_group?: string | null
          prescribed_sets?: number | null
          prescribed_reps?: string | null
          prescribed_weight_kg?: number | null
          target_rpe?: string | null
          target_rir?: string | null
          rest_seconds?: number | null
          order_index?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          performed_workout_id?: string
          catalog_exercise_id?: string | null
          exercise_name?: string
          primary_muscle_group?: string | null
          prescribed_sets?: number | null
          prescribed_reps?: string | null
          prescribed_weight_kg?: number | null
          target_rpe?: string | null
          target_rir?: string | null
          rest_seconds?: number | null
          order_index?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workout_set_logs: {
        Row: {
          id: string
          user_id: string
          exercise_id: string | null
          performed_workout_id: string | null
          performed_exercise_id: string | null
          exercise_name: string
          set_number: number | null
          weight_kg: number | null
          reps: number | null
          rpe: number | null
          notes: string | null
          logged_at: string
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id?: string | null
          performed_workout_id?: string | null
          performed_exercise_id?: string | null
          exercise_name: string
          set_number?: number | null
          weight_kg?: number | null
          reps?: number | null
          rpe?: number | null
          notes?: string | null
          logged_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string | null
          performed_workout_id?: string | null
          performed_exercise_id?: string | null
          exercise_name?: string
          set_number?: number | null
          weight_kg?: number | null
          reps?: number | null
          rpe?: number | null
          notes?: string | null
          logged_at?: string
        }
        Relationships: []
      }
      food_items: {
        Row: {
          id: string
          user_id: string
          name: string
          category: string
          portion_label: string
          grams: number | null
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          tracking_unit: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          category: string
          portion_label: string
          grams?: number | null
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          tracking_unit?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          category?: string
          portion_label?: string
          grams?: number | null
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          tracking_unit?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      saved_food_portions: {
        Row: {
          id: string
          user_id: string
          normalized_name: string
          name: string
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          normalized_name: string
          name: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          normalized_name?: string
          name?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          created_at?: string
        }
        Relationships: []
      }
      food_substitution_groups: {
        Row: {
          id: string
          user_id: string
          name: string
          macro_type: string
          target_macro_g: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          macro_type: string
          target_macro_g: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          macro_type?: string
          target_macro_g?: number
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      food_substitution_group_items: {
        Row: {
          id: string
          group_id: string
          food_item_id: string
          quantity: number
          label: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          food_item_id: string
          quantity?: number
          label: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          food_item_id?: string
          quantity?: number
          label?: string
          created_at?: string
        }
        Relationships: []
      }
      nutrition_plans: {
        Row: {
          id: string
          user_id: string
          title: string
          provider_name: string | null
          calories_target: number | null
          starts_on: string
          ends_on: string | null
          storage_path: string
          original_filename: string
          mime_type: string
          notes: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          provider_name?: string | null
          calories_target?: number | null
          starts_on: string
          ends_on?: string | null
          storage_path: string
          original_filename: string
          mime_type?: string
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          provider_name?: string | null
          calories_target?: number | null
          starts_on?: string
          ends_on?: string | null
          storage_path?: string
          original_filename?: string
          mime_type?: string
          notes?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nutrition_targets: {
        Row: {
          id: string
          user_id: string
          day_type: string
          calories_target: number
          protein_target: number
          carbs_target: number
          fat_target: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day_type: string
          calories_target: number
          protein_target: number
          carbs_target: number
          fat_target: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_type?: string
          calories_target?: number
          protein_target?: number
          carbs_target?: number
          fat_target?: number
          created_at?: string
        }
        Relationships: []
      }
      nutrition_days: {
        Row: {
          id: string
          user_id: string
          date: string
          day_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          day_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          day_type?: string
          created_at?: string
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          meal_name: string
          logged_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          meal_name: string
          logged_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          meal_name?: string
          logged_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      meal_log_items: {
        Row: {
          id: string
          meal_log_id: string
          food_item_id: string | null
          name: string
          quantity: number
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          created_at: string
        }
        Insert: {
          id?: string
          meal_log_id: string
          food_item_id?: string | null
          name: string
          quantity?: number
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          created_at?: string
        }
        Update: {
          id?: string
          meal_log_id?: string
          food_item_id?: string | null
          name?: string
          quantity?: number
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          created_at?: string
        }
        Relationships: []
      }
      training_phases: {
        Row: {
          id: string
          user_id: string
          kind: string
          start_date: string
          end_date: string | null
          target_rate_kg_per_week: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          start_date: string
          end_date?: string | null
          target_rate_kg_per_week?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          start_date?: string
          end_date?: string | null
          target_rate_kg_per_week?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      upsert_apple_health_activities: {
        Args: { p_rows: Json }
        Returns: number
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
