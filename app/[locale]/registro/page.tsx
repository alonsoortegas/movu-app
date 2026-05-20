"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { WorkoutType } from "@/types";

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

function localDateValue(date = new Date()): string {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

export default function RegistroPage() {
  const t = useTranslations("registro");
  const locale = useLocale();
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
  const [dailyDate, setDailyDate] = useState(todayValue);
  const [sleepHours, setSleepHours] = useState("");
  const [steps, setSteps] = useState("");
  const [profileSex, setProfileSex] = useState<string | null>(null);
  const [isOnPeriod, setIsOnPeriod] = useState<boolean | null>(null);
  const [effort, setEffort] = useState(3);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dailySaved, setDailySaved] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const subtypeOptions = WORKOUT_SUBTYPES_BY_TYPE[type] ?? [];
  const showDistance = type === "running" || type === "cycling" || type === "cardio";
  const showPeriodQuestion = profileSex === "female";

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((profile) => setProfileSex(profile.sex ?? null))
      .catch(() => {});
  }, []);

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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setType("weightlifting");
      setWorkoutDate(todayValue);
      setClassName(WORKOUT_SUBTYPES_BY_TYPE.weightlifting[0]);
      setStudio("");
      setCoachName("");
      setDuration("");
      setCalories("");
      setDistance("");
      setEffort(3);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDailySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setDailyError(null);
    setDailyLoading(true);
    try {
      const res = await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dailyDate,
          sleep_hours: sleepHours ? Number(sleepHours) : undefined,
          steps: steps ? Number(steps) : undefined,
          is_on_period: showPeriodQuestion && isOnPeriod !== null ? isOnPeriod : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save");
      }
      setSleepHours("");
      setSteps("");
      setIsOnPeriod(null);
      setDailyDate(todayValue);
      setDailySaved(true);
      setTimeout(() => setDailySaved(false), 3000);
    } catch (err) {
      setDailyError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDailyLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-[#111]">{t("title")}</h1>
        <p className="text-xs md:text-sm text-muted mt-0.5 capitalize">{todayLabel}</p>
      </div>
      <form onSubmit={handleSave} className="space-y-5 md:space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">{t("workoutDate")}</label>
          <input type="date" value={workoutDate} onChange={(e) => setWorkoutDate(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#444] mb-3">{t("classType")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-2.5">
            {CLASS_TYPE_KEYS.map((key) => (
              <button key={key} type="button" onClick={() => handleTypeChange(key)}
                className={`flex flex-col items-center gap-1 md:gap-1.5 py-3 md:py-4 rounded-xl border-2 transition-all ${type === key ? "bg-accent-light border-accent shadow-sm" : "bg-surface border-border hover:border-[#ccc]"}`}>
                <span className="text-xl md:text-2xl">{CLASS_EMOJIS[key]}</span>
                <span className={`text-[11px] md:text-xs font-medium ${type === key ? "text-[#444]" : "text-muted"}`}>{t(`classTypes.${key}`)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">{t("className")}</label>
          <select value={className} onChange={(e) => setClassName(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all">
            {subtypeOptions.map((subtype) => (
              <option key={subtype} value={subtype}>{subtype}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">{t("studio")}</label>
          <input type="text" value={studio} onChange={(e) => setStudio(e.target.value)} placeholder={t("studioPlaceholder")}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">{t("coachName")}</label>
          <input type="text" value={coachName} onChange={(e) => setCoachName(e.target.value)} placeholder={t("coachPlaceholder")}
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">{t("duration")}</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t("durationPlaceholder")} min={0} max={300}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">{t("calories")}</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder={t("caloriesPlaceholder")} min={0}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
        </div>
        <div className={`transition-all duration-300 overflow-hidden ${showDistance ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
          <label className="block text-sm font-medium text-[#444] mb-2">
            {t("distance")} <span className="text-muted font-normal text-xs">{t("distanceOptional")}</span>
          </label>
          <input type="number" value={distance} onChange={(e) => setDistance(e.target.value)} placeholder={t("distancePlaceholder")} step="0.1" min={0}
            className="w-full bg-accent-light border-2 border-dashed border-accent rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-[#999] outline-none focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#444] mb-3">{t("effort")}</label>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setEffort(n)}
                className={`flex-1 h-6 md:h-8 rounded-md border-2 transition-all ${n <= effort ? "bg-accent-light border-accent" : "bg-surface border-border hover:border-[#ccc]"}`} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>{t("effortSoft")}</span>
            <span className="text-[#555] font-medium">{t(`effortLabels.${effort}`)}</span>
            <span>{t("effortMax")}</span>
          </div>
        </div>
        <div className="hidden md:block pt-2">
          {saveError && <p className="text-sm text-red-500 mb-2">{saveError}</p>}
          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${saved ? "bg-[#4caf50] text-white" : "bg-accent hover:bg-accent-dark text-white shadow-sm hover:shadow-md"}`}>
            {loading ? "Saving…" : saved ? t("saved") : t("save")}
          </button>
        </div>
      </form>
      <div className="md:hidden fixed bottom-[72px] left-4 right-4">
        {saveError && <p className="text-sm text-red-500 mb-2 text-center">{saveError}</p>}
        <button onClick={handleSave} disabled={loading}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all disabled:opacity-60 ${saved ? "bg-[#4caf50] text-white" : "bg-accent text-white"}`}>
          {loading ? "Saving…" : saved ? t("savedShort") : t("save")}
        </button>
      </div>
      <form onSubmit={handleDailySave} className="mt-6 md:mt-8 bg-surface border border-border rounded-xl p-4 md:p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#111]">{t("dailyLogTitle")}</h2>
          <p className="text-xs text-muted mt-0.5">{t("dailyLogSubtitle")}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">{t("dailyLogDate")}</label>
          <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)}
            className="w-full bg-white border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">{t("sleepHours")}</label>
            <input type="number" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder={t("sleepHoursPlaceholder")} step="0.1" min={0} max={24}
              className="w-full bg-white border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">{t("steps")}</label>
            <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder={t("stepsPlaceholder")} min={0}
              className="w-full bg-white border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
        </div>
        {showPeriodQuestion && (
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">{t("periodQuestion")}</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: t("yes") },
                { value: false, label: t("no") },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => setIsOnPeriod(option.value)}
                  className={`py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                    isOnPeriod === option.value
                      ? "bg-accent-light border-accent text-[#333]"
                      : "bg-white border-border text-muted hover:border-[#ccc]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {dailyError && <p className="text-sm text-red-500">{dailyError}</p>}
        <button type="submit" disabled={dailyLoading}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${dailySaved ? "bg-[#4caf50] text-white" : "bg-[#111] hover:bg-[#333] text-white"}`}>
          {dailyLoading ? "Saving…" : dailySaved ? t("dailyLogSaved") : t("dailyLogSave")}
        </button>
      </form>
    </div>
  );
}
