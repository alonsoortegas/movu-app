export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ActivityCategory = 'run' | 'strength' | 'hiit' | 'mobility' | 'other'
export type WaitlistStatus = 'waiting' | 'invited' | 'converted'
export type InsightType = 'weekly_summary' | 'recovery_alert' | 'plan_suggestion'

export type HrZones = {
  z1_s: number
  z2_s: number
  z3_s: number
  z4_s: number
  z5_s: number
}

// Row types
export type InviteCodeRow = {
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

export type WaitlistRow = {
  id: string
  email: string
  name: string | null
  city: string | null
  goal: string | null
  referred_by: string | null
  position: number
  status: WaitlistStatus
  invited_at: string | null
  created_at: string
}

export type UserProfileRow = {
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

export type ActivityRow = {
  id: string
  user_id: string
  strava_id: number | null
  source: string
  activity_type: string | null
  activity_category: ActivityCategory | null
  activity_name: string | null
  start_date_utc: string | null
  start_date_local: string | null
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
  hr_zones: HrZones | null
  trainer: boolean | null
  created_at: string
}

export type SleepLogRow = {
  id: string
  user_id: string
  date: string
  hours: number | null
  quality: number | null
  source: string
  notes: string | null
  created_at: string
}

export type BodyMeasurementRow = {
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

export type InsightRow = {
  id: string
  user_id: string
  period_start: string | null
  period_end: string | null
  type: InsightType | null
  content: string | null
  model_used: string | null
  created_at: string
}

// Full Database type required by @supabase/supabase-js generics
export type Database = {
  public: {
    Tables: {
      invite_codes: {
        Row: InviteCodeRow
        Insert: Omit<InviteCodeRow, 'id' | 'created_at' | 'uses_count'>
        Update: Partial<Omit<InviteCodeRow, 'id' | 'created_at'>>
        Relationships: []
      }
      waitlist: {
        Row: WaitlistRow
        Insert: Omit<WaitlistRow, 'id' | 'position' | 'created_at'>
        Update: Partial<Omit<WaitlistRow, 'id' | 'position' | 'created_at'>>
        Relationships: []
      }
      user_profiles: {
        Row: UserProfileRow
        Insert: Omit<UserProfileRow, 'created_at'>
        Update: Partial<Omit<UserProfileRow, 'created_at'>>
        Relationships: []
      }
      activities: {
        Row: ActivityRow
        Insert: Omit<ActivityRow, 'id' | 'created_at'>
        Update: Partial<Omit<ActivityRow, 'id' | 'created_at'>>
        Relationships: []
      }
      sleep_logs: {
        Row: SleepLogRow
        Insert: Omit<SleepLogRow, 'id' | 'created_at'>
        Update: Partial<Omit<SleepLogRow, 'id' | 'created_at'>>
        Relationships: []
      }
      body_measurements: {
        Row: BodyMeasurementRow
        Insert: Omit<BodyMeasurementRow, 'id' | 'created_at'>
        Update: Partial<Omit<BodyMeasurementRow, 'id' | 'created_at'>>
        Relationships: []
      }
      insights: {
        Row: InsightRow
        Insert: Omit<InsightRow, 'id' | 'created_at'>
        Update: Partial<Omit<InsightRow, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
