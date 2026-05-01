import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_EMOJIS: Record<string, string> = {
  mon: "💪", tue: "🚴", wed: "💪", thu: "😴", fri: "🏃", sat: "🔄", sun: "—",
};
const DAY_IS_TODAY: Record<string, boolean> = { fri: true };

const RECENT_WORKOUTS = [
  { name: "Spinning", studio: "Cyclo Studio", duration: "45 min", emoji: "🚴" },
  { name: "Pesas — Pierna", studio: "Gym Club", duration: "60 min", emoji: "💪" },
  { name: "Barre", studio: "Studio MX", duration: "50 min", emoji: "🩰" },
];

const PROGRESS_ITEMS = [
  { key: "workouts" as const, val: 4, max: 5 },
  { key: "activeMinutes" as const, val: 220, max: 300 },
  { key: "calories" as const, val: 1680, max: 2000 },
];

const MUSCLE_GROUPS = [
  ["Pecho", "2x"], ["Espalda", "1x"], ["Pierna", "1x"], ["Core", "3x"], ["Cardio", "2x"],
];

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 md:mb-8">
        <div>
          <h1 className="text-xl font-bold text-[#111] md:hidden">{t("greeting")}</h1>
          <h1 className="hidden md:block text-2xl font-bold text-[#111]">{t("title")}</h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">{t("weekLabel")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#eee] border border-[#e0e0e0] flex items-center justify-center text-base md:hidden">🧑</div>
          <Link href={`/${locale}/registro`} className="hidden md:block bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
            {t("registerToday")}
          </Link>
        </div>
      </div>

      <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-4 md:p-5 mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">{t("aiLabel")}</span>
          <span className="text-xs font-semibold text-[#555]">{t("aiInsightTitle")}</span>
        </div>
        <p className="text-sm text-[#333] leading-relaxed">&ldquo;{t("aiInsight")}&rdquo;</p>
      </div>

      <div className="mb-4 md:mb-6">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 md:mb-3">{t("thisWeek")}</p>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {DAY_KEYS.map((key) => {
            const day = t.raw(`weekDays.${key}`) as { short: string; label: string; type: string };
            const isToday = DAY_IS_TODAY[key] ?? false;
            return (
              <div key={key} className={`rounded-xl border p-2 md:p-3 text-center transition-all ${isToday ? "bg-accent-light border-accent shadow-sm" : "bg-surface border-border"}`}>
                <div className={`text-[10px] md:text-xs font-medium mb-1 ${isToday ? "text-[#555]" : "text-muted"}`}>{day.short}</div>
                <div className="text-sm md:text-lg mb-0.5 md:mb-1">{DAY_EMOJIS[key]}</div>
                <div className={`text-[9px] leading-tight hidden md:block ${isToday ? "text-[#444] font-medium" : "text-muted"}`}>{day.type}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        {[
          { emoji: "💤", labelKey: "metrics.sleep" as const, value: "7h 20m", subKey: "metrics.sleepSub" as const },
          { emoji: "🔥", labelKey: "metrics.calories" as const, value: "420 kcal", subKey: null },
          { emoji: "⏱", labelKey: "metrics.time" as const, value: "55 min", subKey: null },
        ].map(({ emoji, labelKey, value, subKey }) => (
          <div key={labelKey} className="bg-surface border border-border rounded-xl p-3 md:p-5 text-center md:text-left">
            <div className="text-lg md:text-2xl mb-1 md:mb-2">{emoji}</div>
            <div className="text-[10px] md:text-xs text-muted mb-0.5 md:mb-1">{t(labelKey)}</div>
            <div className="text-sm md:text-2xl font-bold text-[#111] leading-tight">{value}</div>
            {subKey && <div className="text-[10px] text-muted mt-0.5 hidden md:block">{t(subKey)}</div>}
          </div>
        ))}
      </div>

      <div className="mb-4 md:mb-6">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 md:mb-3">{t("recentWorkouts")}</h2>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {RECENT_WORKOUTS.map((w, i) => (
            <div key={i} className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 ${i < RECENT_WORKOUTS.length - 1 ? "border-b border-dashed border-border" : ""}`}>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-accent-light border border-accent flex items-center justify-center text-base flex-shrink-0">{w.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#111] truncate">{w.name}</div>
                <div className="text-xs text-muted">{w.studio} · {w.duration}</div>
              </div>
              <span className="text-muted text-sm">›</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t("weeklyProgress")}</h3>
          <div className="space-y-2.5">
            {PROGRESS_ITEMS.map(({ key, val, max }) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#555]">{t(`progress.${key}`)}</span>
                  <span className="text-[#888]">{val} / {max}</span>
                </div>
                <div className="h-1.5 bg-[#e8e8e8] rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${(val / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t("muscleGroups")}</h3>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map(([m, c]) => (
              <div key={m} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light border border-accent text-xs text-[#444]">
                {m}<span className="font-bold text-accent-dark">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link href={`/${locale}/registro`} className="md:hidden fixed bottom-[72px] left-4 right-4 bg-accent text-white text-sm font-semibold text-center py-3.5 rounded-xl shadow-lg">
        {t("registerCta")}
      </Link>
    </div>
  );
}
