"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { WorkoutType } from "@/types";
import MobilePageIntro from "@/components/mobile/MobilePageIntro";
import { useRouter } from "@/i18n/navigation";

const CLASS_TYPE_KEYS: WorkoutType[] = ["weightlifting", "functional-fitness", "bootcamp", "running", "cycling", "cardio", "yoga", "other"];
const CLASS_EMOJIS: Record<string, string> = {
  weightlifting: "💪",
  "functional-fitness": "🏋️",
  bootcamp: "🥊",
  running: "🏃",
  cycling: "🚴",
  cardio: "⚡",
  yoga: "🧘",
  other: "✨",
};
const WORKOUT_SUBTYPES_BY_TYPE: Record<string, string[]> = {
  weightlifting: [
    "Pesas superior",
    "Pesas inferior",
    "Pesas, brazos",
    "Pesas, hombro",
    "Pesas, pecho",
    "Pesas, espalda",
    "Pesas, pierna y glúteo",
  ],
  "functional-fitness": ["Funcional superior", "Funcional inferior", "Hyrox"],
  bootcamp: ["Bootcamp"],
  running: ["Correr exterior", "Correr en banda"],
  cycling: ["Bici indoor", "Bici exterior"],
  cardio: ["Caminar", "Elíptica", "Escaladora", "Hiking"],
  yoga: ["Yoga", "Pilates", "Hot pilates", "Barre", "Hot barre", "Danza aérea"],
  other: ["Pádel"],
};

const HYROX_EXERCISES = [
  { exercise_name: "SkiErg", primary_muscle_group: "back", order_index: 0 },
  { exercise_name: "Sled push", primary_muscle_group: "legs", order_index: 1 },
  { exercise_name: "Sled pull", primary_muscle_group: "back", order_index: 2 },
  { exercise_name: "Burpee broad jump", primary_muscle_group: "legs", order_index: 3 },
  { exercise_name: "Rowing", primary_muscle_group: "back", order_index: 4 },
  { exercise_name: "Farmers carry", primary_muscle_group: "arms", order_index: 5 },
  { exercise_name: "Sandbag lunge", primary_muscle_group: "legs", order_index: 6 },
  { exercise_name: "Wall balls", primary_muscle_group: "legs", order_index: 7 },
];

function localDateValue(date = new Date()): string {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

export default function RegistroPage() {
  const t = useTranslations("registro");
  const locale = useLocale();
  const router = useRouter();
  const todayLabel = useMemo(() =>
    new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date()),
    [locale]
  );
  const todayValue = useMemo(() => localDateValue(), []);
  const [type, setType] = useState<WorkoutType>("weightlifting");
  const [workoutDate, setWorkoutDate] = useState(todayValue);
  const [className, setClassName] = useState(WORKOUT_SUBTYPES_BY_TYPE.weightlifting[0]);
  const [studio, setStudio] = useState("");
  const [coachName, setCoachName] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [effort, setEffort] = useState(3);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const subtypeOptions = WORKOUT_SUBTYPES_BY_TYPE[type] ?? [];
  const showDistance = type === "running" || type === "cycling" || type === "cardio";

  const handleTypeChange = (nextType: WorkoutType) => {
    setType(nextType);
    setClassName(WORKOUT_SUBTYPES_BY_TYPE[nextType]?.[0] ?? "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date: workoutDate,
          className,
          studio,
          coachName,
          duration_min: duration ? Number(duration) : undefined,
          calories: calories ? Number(calories) : undefined,
          rpe: effort,
          distance_km: distance ? Number(distance) : undefined,
        }),
      });
      const activityBody = await res.json();
      if (!res.ok) {
        const data = activityBody;
        throw new Error(data.error ?? "Failed to save");
      }
      const workoutResponse = await fetch("/api/performed-workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityBody.activity.id,
          title: className || t(`classTypes.${type}`),
          workout_type: type,
          performed_on: workoutDate,
          started_at: `${workoutDate}T12:00:00.000Z`,
          duration_min: Number(duration),
          status: "in_progress",
          exercises: className.toLowerCase() === "hyrox" ? HYROX_EXERCISES : [],
        }),
      });
      const workoutBody = await workoutResponse.json();
      if (!workoutResponse.ok) {
        throw new Error(workoutBody.error ?? "Failed to create workout session");
      }
      setSaved(true);
      router.push(`/registro/${workoutBody.workout.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="boot mx-auto max-w-2xl p-4 md:p-8">
      <MobilePageIntro title={t("title")} eyebrow={t("subtitle")} />
      <div className="mb-8 hidden md:block">
        <h1 className="display text-2xl font-bold text-[var(--text)]">{t("title")}</h1>
        <p className="mt-0.5 text-sm capitalize text-muted">{todayLabel}</p>
      </div>
      <form onSubmit={handleSave} className="panel mobile-sheet space-y-5 rounded-[1.6rem] p-4 md:space-y-6 md:rounded-2xl md:p-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("workoutDate")}</label>
          <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-3">{t("classType")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-2.5">
            {CLASS_TYPE_KEYS.map((key) => (
              <button key={key} type="button" onClick={() => handleTypeChange(key)}
                className={`flex flex-col items-center gap-1 md:gap-1.5 py-3 md:py-4 rounded-xl border-2 transition-all ${type === key ? "bg-accent-light border-accent shadow-sm" : "bg-surface border-border hover:border-[var(--border-hi)]"}`}>
                <span className="text-xl md:text-2xl">{CLASS_EMOJIS[key]}</span>
                <span className={`text-[11px] md:text-xs font-medium ${type === key ? "text-[var(--text-dim)]" : "text-muted"}`}>{t(`classTypes.${key}`)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("className")}</label>
          <select value={className} onChange={(e) => setClassName(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all">
            {subtypeOptions.map((subtype) => (
              <option key={subtype} value={subtype}>{subtype}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("studio")}</label>
          <input type="text" value={studio} onChange={(e) => setStudio(e.target.value)} placeholder={t("studioPlaceholder")}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("coachName")}</label>
          <input type="text" value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder={t("coachPlaceholder")}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("duration")}</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("durationPlaceholder")} min={0} max={300}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("calories")}</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder={t("caloriesPlaceholder")} min={0}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
        </div>
        <div className={`transition-all duration-300 overflow-hidden ${showDistance ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">
            {t("distance")} <span className="text-muted font-normal text-xs">{t("distanceOptional")}</span>
          </label>
          <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder={t("distancePlaceholder")} step="0.1" min={0}
            className="w-full bg-accent-light border-2 border-dashed border-accent rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] placeholder-[var(--text-faint)] outline-none focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-dim)] mb-3">{t("effort")}</label>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setEffort(n)}
                className={`flex-1 h-6 md:h-8 rounded-md border-2 transition-all ${n <= effort ? "bg-accent-light border-accent" : "bg-surface border-border hover:border-[var(--border-hi)]"}`} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>{t("effortSoft")}</span>
            <span className="text-[var(--text-dim)] font-medium">{t(`effortLabels.${effort}`)}</span>
            <span>{t("effortMax")}</span>
          </div>
        </div>
        <div className="hidden md:block pt-2">
          {saveError && <p className="text-sm text-red-500 mb-2">{saveError}</p>}
          <button type="submit" disabled={loading}
            className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all disabled:opacity-60 ${saved ? "bg-[#4caf50] text-white" : "btn-accent"}`}>
            {loading ? "Saving…" : saved ? t("saved") : t("save")}
          </button>
        </div>
      </form>
      <div className="fixed left-4 right-4 z-40 md:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}>
        {saveError && <p className="text-sm text-red-500 mb-2 text-center">{saveError}</p>}
        <button onClick={handleSave} disabled={loading}
          className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-60 ${saved ? "bg-[#4caf50] text-white" : "btn-accent"}`}>
          {loading ? "Saving…" : saved ? t("savedShort") : t("save")}
        </button>
      </div>
    </div>
  );
}
