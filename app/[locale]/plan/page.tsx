import { getTranslations, setRequestLocale } from "next-intl/server";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_EMOJIS: Record<string, string> = { mon: "💪", tue: "🦵", wed: "🏃", thu: "😴", fri: "🔙", sat: "🔄", sun: "😴" };
const DAY_DURATION: Record<string, number> = { mon: 50, tue: 60, wed: 40, thu: 0, fri: 55, sat: 60, sun: 0 };
const BADGE_KEYS = ["chest", "legs", "cardio", "back"] as const;
const BADGE_COUNTS: Record<string, string> = { chest: "2x", legs: "1x", cardio: "2x", back: "1x" };
const BADGE_EMOJIS: Record<string, string> = { chest: "💪", legs: "🦵", cardio: "🏃", back: "🔙" };
const VOLUME_KEYS = ["chest", "legs", "back", "core", "cardio"] as const;
const VOLUME_PCTS: Record<string, number> = { chest: 60, legs: 80, back: 40, core: 55, cardio: 65 };
const TYPE_PILL: Record<string, string> = {
  Pesas: "bg-accent-light text-[#444] border-accent",
  Weights: "bg-accent-light text-[#444] border-accent",
  Cardio: "bg-[#ffefd4] text-[#666] border-[#f0c870]",
  Combinado: "bg-[#f0d4ff] text-[#664] border-[#c890e8]",
  Combined: "bg-[#f0d4ff] text-[#664] border-[#c890e8]",
};

export default async function PlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("plan");

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#111]">{t("title")}</h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">{t("subtitle")}</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-accent-light border border-accent rounded-lg text-xs md:text-sm font-medium text-[#444] hover:bg-[#c0f0a0] transition-colors">
          <span className="hidden md:inline">{t("regenerateDesktop")}</span>
          <span className="md:hidden">{t("regenerateMobile")}</span>
        </button>
      </div>

      <div className="md:hidden space-y-0 mb-4">
        {DAY_KEYS.map((key, i) => {
          const row = t.raw(`planRows.${key}`) as { day: string; dayShort: string; muscle: string; type: string };
          const isRest = row.type === "—";
          return (
            <div key={key} className={`flex items-center gap-3 py-3 ${i < DAY_KEYS.length - 1 ? "border-b border-dashed border-border" : ""}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${isRest ? "bg-[#f0f0f0] border border-[#e0e0e0]" : "bg-accent-light border border-dashed border-accent"}`}>{DAY_EMOJIS[key]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-muted">{row.day}</div>
                <div className={`text-sm font-semibold truncate ${isRest ? "text-muted" : "text-[#111]"}`}>{row.muscle}</div>
              </div>
              {DAY_DURATION[key] > 0 && <div className="text-xs text-muted flex-shrink-0">{DAY_DURATION[key]}m</div>}
            </div>
          );
        })}
      </div>

      <div className="md:hidden flex flex-wrap gap-2 mb-4">
        {BADGE_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-xs text-[#444]">
            {BADGE_EMOJIS[key]} {t(`muscleBadges.${key}`)} <span className="font-bold text-accent-dark">{BADGE_COUNTS[key]}</span>
          </div>
        ))}
      </div>

      <div className="md:hidden bg-accent-light border-2 border-dashed border-accent rounded-xl p-4 mb-4">
        <div className="text-xs font-bold text-accent-dark mb-1.5 tracking-wide">{t("planLogicTitle")}</div>
        <p className="text-sm text-[#444] leading-relaxed">{t("planLogicText")}</p>
      </div>

      <div className="hidden md:grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_100px_60px] bg-surface border-b border-border px-5 py-3">
              {(["day", "muscleGroup", "type", "min"] as const).map((h) => (
                <div key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{t(`tableHeaders.${h}`)}</div>
              ))}
            </div>
            {DAY_KEYS.map((key, i) => {
              const row = t.raw(`planRows.${key}`) as { day: string; dayShort: string; muscle: string; type: string };
              const isRest = row.type === "—";
              return (
                <div key={key} className={`grid grid-cols-[100px_1fr_100px_60px] px-5 py-3.5 items-center ${i < DAY_KEYS.length - 1 ? "border-b border-dashed border-border" : ""} ${isRest ? "opacity-50" : i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"}`}>
                  <div className="text-sm font-medium text-[#333]">{row.day}</div>
                  <div className="text-sm text-[#444]">{row.muscle}</div>
                  <div>{!isRest ? <span className={`text-xs px-2.5 py-0.5 rounded-full border ${TYPE_PILL[row.type] || "bg-surface border-border text-muted"}`}>{row.type}</span> : <span className="text-sm text-muted">—</span>}</div>
                  <div className="text-sm text-muted">{DAY_DURATION[key] > 0 ? DAY_DURATION[key] : ""}</div>
                </div>
              );
            })}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t("muscleGroupsWeek")}</h3>
            <div className="flex flex-wrap gap-2">
              {BADGE_KEYS.map((key) => (
                <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-xs text-[#444]">
                  {BADGE_EMOJIS[key]} {t(`muscleBadges.${key}`)} <span className="font-bold text-accent-dark">{BADGE_COUNTS[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">{t("weeklyVolume")}</h3>
            <div className="space-y-3">
              {VOLUME_KEYS.map((key) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#555]">{t(`volumeBars.${key}`)}</span>
                    <span className="text-muted">{VOLUME_PCTS[key]}%</span>
                  </div>
                  <div className="h-2 bg-[#e8e8e8] rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${VOLUME_PCTS[key]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-5">
            <div className="text-xs font-bold text-accent-dark mb-2 tracking-wide">{t("planLogicTitle")}</div>
            <p className="text-sm text-[#444] leading-relaxed">{t("planLogicText")}</p>
          </div>
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t("weeklyGoalLabel")}</h3>
            <div className="text-3xl font-bold text-[#111] mb-1">4 <span className="text-sm font-normal text-muted">{t("weeklyGoalDays")}</span></div>
            <div className="h-2 bg-[#e8e8e8] rounded-full overflow-hidden mt-2">
              <div className="h-full bg-accent rounded-full" style={{ width: "80%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
