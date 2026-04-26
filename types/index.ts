export type WorkoutType =
  | "pesas"
  | "cardio"
  | "correr"
  | "combinado"
  | "bootcamp"
  | "taller"
  | "descanso";

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  className: string;
  studio: string;
  durationMin: number;
  calories: number;
  distanceKm?: number;
  effort: number; // 1-5
}

export interface DayMetrics {
  sleepHours: number;
  sleepQuality: "Buena calidad" | "Regular" | "Mala calidad";
  calories: number;
  activeMin: number;
}

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

export interface UserProfile {
  name: string;
  goal: string;
  muscleMassKg: number;
  bodyFatPct: number;
  weeklyGoal: number;
}
