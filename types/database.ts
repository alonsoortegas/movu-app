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
  BodyMeasurement as BodyMeasurementRow,
  NewBodyMeasurement,
  Insight as InsightRow,
  NewInsight,
  ActivityCategory,
  ActivitySource,
  WaitlistStatus,
  InsightType,
} from '@/db/schema'

// HrZones type (used in hr_zones jsonb field)
export type HrZones = {
  z1_s: number
  z2_s: number
  z3_s: number
  z4_s: number
  z5_s: number
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
          full_name: string | null
          city: string | null
          goal: string | null
          max_hr_bpm: number | null
          weight_kg: number | null
          strava_athlete_id: number | null
          strava_access_token: string | null
          strava_refresh_token: string | null
          strava_token_expires: string | null
          invite_code_used: string | null
          onboarding_complete: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          city?: string | null
          goal?: string | null
          max_hr_bpm?: number | null
          weight_kg?: number | null
          strava_athlete_id?: number | null
          strava_access_token?: string | null
          strava_refresh_token?: string | null
          strava_token_expires?: string | null
          invite_code_used?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          city?: string | null
          goal?: string | null
          max_hr_bpm?: number | null
          weight_kg?: number | null
          strava_athlete_id?: number | null
          strava_access_token?: string | null
          strava_refresh_token?: string | null
          strava_token_expires?: string | null
          invite_code_used?: string | null
          onboarding_complete?: boolean
          created_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          user_id: string
          strava_id: number | null
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
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          strava_id?: number | null
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
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          strava_id?: number | null
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
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
