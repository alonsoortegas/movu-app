// ---------------------------------------------------------------------------
// Workout types
// ---------------------------------------------------------------------------

export type WorkoutType =
  | "weightlifting"
  | "cardio"
  | "running"
  | "combined"
  | "bootcamp"
  | "workshop"
  | "rest"
  | "yoga"
  | "cycling"
  | "hiit"
  | "functional-fitness"
  | "other";

// Maps WHOOP sport_name values to Movu WorkoutType
export const WHOOP_SPORT_MAP: Record<string, WorkoutType> = {
  "weightlifting":       "weightlifting",
  "functional-fitness":  "functional-fitness",
  "barrys":              "combined",
  "cycling":             "cardio",
  "hiit":                "hiit",
  "yoga":                "yoga",
  "running":             "running",
  "walking":             "other",
  "commuting":           "other",
};

export interface Workout {
  id: string;
  userId: string;
  date: string;
  type: WorkoutType;
  className?: string;   // user-provided class name (e.g. "Pesas — Pierna") — not from WHOOP
  studio?: string;      // user-provided studio name — not from WHOOP
  durationMin: number;
  calories: number;
  distanceKm?: number;
  effort?: number;      // subjective RPE 1–10 (manual); null when sourced from WHOOP
  // WHOOP-specific fields — stored as-is for now, can be transformed later
  whoopId?: string;
  strain?: number;      // WHOOP strain 0–21; rough RPE proxy: <8 easy, 8–14 moderate, 14–18 hard, >18 max
  avgHeartRate?: number;
  maxHeartRate?: number;
  heartRateZones?: HeartRateZones;
  source: "manual" | "whoop";
}

export interface HeartRateZones {
  zone0Min: number;  // rest / very light
  zone1Min: number;  // warm-up
  zone2Min: number;  // easy aerobic
  zone3Min: number;  // aerobic
  zone4Min: number;  // threshold
  zone5Min: number;  // max effort
}

// ---------------------------------------------------------------------------
// Daily metrics
// ---------------------------------------------------------------------------

export interface DayMetrics {
  userId: string;
  date: string;
  // Calories
  totalCalories: number;       // full-day TDEE — from WHOOP cycle kilojoule or manual
  activeMin: number;
  // Sleep
  sleepHours: number;
  sleepPerformancePct?: number; // 0–100 from WHOOP; replaces the old 3-state enum
  sleepConsistencyPct?: number;
  sleepEfficiencyPct?: number;
  sleepStages?: SleepStages;
  sleepNeeded?: SleepNeeded;
  respiratoryRate?: number;
  // Recovery
  recoveryScore?: number;       // 0–100 from WHOOP
  hrv?: number;                 // ms RMSSD from WHOOP
  restingHeartRate?: number;
  spo2Pct?: number;
  skinTempCelsius?: number;
  // Strain & daily HR
  dailyStrain?: number;         // WHOOP cycle strain 0–21
  dailyAvgHeartRate?: number;
  dailyMaxHeartRate?: number;
  source: "manual" | "whoop";
}

export interface SleepStages {
  remHours: number;
  deepHours: number;
  lightHours: number;
  awakeHours: number;
  cycleCount: number;
  disturbanceCount: number;
}

export interface SleepNeeded {
  baselineHours: number;        // WHOOP's baseline need for this individual
  debtHours: number;            // extra need from accumulated sleep debt
  strainDebtHours: number;      // extra need driven by recent training load
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface WeekDay {
  label: string;
  short: string;
  type: WorkoutType | "—";
  isToday?: boolean;
}

export interface PlanRow {
  day: string;
  muscle: string;
  type: WorkoutType | "—";
  durationMin: number;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;       // Supabase auth user UUID
  name: string;
  goal: string;
  weeklyGoal: number;
  // InBody — manual input, not available from WHOOP API
  muscleMassKg?: number;
  bodyFatPct?: number;
  // From WHOOP /v2/user/measurement/body
  heightM?: number;
  weightKg?: number;
  maxHeartRate?: number;
}
