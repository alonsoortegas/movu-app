import { getTranslations, setRequestLocale } from "next-intl/server";
import MobilePageIntro from "@/components/mobile/MobilePageIntro";
import MobilePanel, { type MobileChannel } from "@/components/mobile/MobilePanel";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_SYMBOLS: Record<string, string> = { mon: "▲", tue: "◆", wed: "↗", thu: "○", fri: "▲", sat: "↗", sun: "○" };
const DAY_DURATION: Record<string, number> = { mon: 50, tue: 60, wed: 40, thu: 0, fri: 55, sat: 60, sun: 0 };
const BADGE_KEYS = ["chest", "legs", "cardio", "back"] as const;
const BADGE_COUNTS: Record<string, string> = { chest: "2x", legs: "1x", cardio: "2x", back: "1x" };
const BADGE_EMOJIS: Record<string, string> = { chest: "💪", legs: "🦵", cardio: "🏃", back: "🔙" };
const VOLUME_KEYS = ["chest", "legs", "back", "core", "cardio"] as const;
const VOLUME_PCTS: Record<string, number> = { chest: 60, legs: 80, back: 40, core: 55, cardio: 65 };
const TYPE_PILL: Record<string, string> = {
  Pesas: "bg-accent-light text-[var(--text)] border-accent",
  Weights: "bg-accent-light text-[var(--text)] border-accent",
  Cardio: "bg-[rgba(251,191,36,0.14)] text-[var(--amber)] border-[rgba(251,191,36,0.34)]",
  Combinado: "bg-[rgba(167,139,250,0.14)] text-[var(--violet)] border-[rgba(167,139,250,0.34)]",
  Combined: "bg-[rgba(167,139,250,0.14)] text-[var(--violet)] border-[rgba(167,139,250,0.34)]",
};

function planChannel(type: string, isRest: boolean): MobileChannel {
  if (isRest) return "neutral";
  if (type === "Cardio") return "cyan";
  if (type === "Combinado" || type === "Combined") return "violet";
  return "lime";
}

export default async function PlanPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("plan");

  return (
    <div className="boot mx-auto max-w-4xl p-4 md:p-8">
      <MobilePageIntro
        title={t("title")}
        eyebrow={t("subtitle")}
        aside={
          <button className="glass grid min-h-11 min-w-11 place-items-center rounded-full border border-accent px-3 text-lg font-semibold text-accent transition-transform active:scale-95">
            ↻
            <span className="sr-only">{t("regenerateMobile")}</span>
          </button>
        }
      />

      <div className="mb-8 hidden items-center justify-between md:flex">
        <div>
          <h1 className="display text-2xl font-bold text-[var(--text)]">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-muted">{t("subtitle")}</p>
        </div>
        <button className="glass flex items-center gap-1.5 rounded-xl border border-accent px-4 py-2 text-sm font-semibold text-[var(--text)] transition-all hover:bg-accent-light active:scale-95">
          {t("regenerateDesktop")}
        </button>
      </div>

      <div className="mb-5 space-y-3 md:hidden">
        {DAY_KEYS.map((key) => {
          const row = t.raw(`planRows.${key}`) as { day: string; dayShort: string; muscle: string; type: string };
          const isRest = row.type === "—";
          const channel = planChannel(row.type, isRest);
          return (
            <MobilePanel key={key} channel={channel} className="rounded-[1.45rem] p-4">
              <div className="flex items-start gap-3">
                <div className="data grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-[color-mix(in_srgb,var(--channel)_38%,transparent)] bg-[color-mix(in_srgb,var(--channel)_10%,transparent)] text-lg font-bold text-[var(--channel)]">
                  {DAY_SYMBOLS[key]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="data text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">{row.day}</div>
                  <div className={`display mt-1 truncate text-lg font-semibold ${isRest ? "text-muted" : "text-[var(--text)]"}`}>{row.muscle}</div>
                </div>
                {DAY_DURATION[key] > 0 && <div className="data flex-shrink-0 text-xs text-[var(--channel)]">{DAY_DURATION[key]}m</div>}
              </div>
              <div className="data mt-4 border-t border-[var(--ink-06)] pt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--text-faint)]">
                {isRest ? row.dayShort : row.type}
              </div>
            </MobilePanel>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-2 md:hidden">
        {BADGE_KEYS.map((key) => (
          <div key={key} data-channel="lime" className="mobile-panel data flex items-center gap-1.5 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[var(--text-dim)]">
            {t(`muscleBadges.${key}`)} <span className="font-bold text-accent-dark">{BADGE_COUNTS[key]}</span>
          </div>
        ))}
      </div>

      <div className="glass ticks mb-5 rounded-[1.6rem] border border-[var(--border-hi)] p-5 md:hidden">
        <div className="data mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-dark">{t("planLogicTitle")}</div>
        <p className="display text-base leading-relaxed text-[var(--text)]">{t("planLogicText")}</p>
      </div>

      <div className="hidden md:grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="panel overflow-hidden rounded-2xl">
            <div className="grid grid-cols-[100px_1fr_100px_60px] bg-surface border-b border-border px-5 py-3">
              {(["day", "muscleGroup", "type", "min"] as const).map((h) => (
                <div key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">{t(`tableHeaders.${h}`)}</div>
              ))}
            </div>
            {DAY_KEYS.map((key, i) => {
              const row = t.raw(`planRows.${key}`) as { day: string; dayShort: string; muscle: string; type: string };
              const isRest = row.type === "—";
              return (
                <div key={key} className={`grid grid-cols-[100px_1fr_100px_60px] items-center px-5 py-3.5 ${i < DAY_KEYS.length - 1 ? "border-b border-[var(--ink-06)]" : ""} ${isRest ? "opacity-50" : i % 2 === 0 ? "bg-[var(--ink-02)]" : ""}`}>
                  <div className="text-sm font-medium text-[var(--text)]">{row.day}</div>
                  <div className="text-sm text-[var(--text-dim)]">{row.muscle}</div>
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
                <div key={key} className="panel flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-[var(--text-dim)]">
                  {BADGE_EMOJIS[key]} {t(`muscleBadges.${key}`)} <span className="font-bold text-accent-dark">{BADGE_COUNTS[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="panel rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">{t("weeklyVolume")}</h3>
            <div className="space-y-3">
              {VOLUME_KEYS.map((key) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[var(--text-dim)]">{t(`volumeBars.${key}`)}</span>
                    <span className="text-muted">{VOLUME_PCTS[key]}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${VOLUME_PCTS[key]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass ticks rounded-2xl border border-[var(--border-hi)] p-5">
            <div className="text-xs font-bold text-accent-dark mb-2 tracking-wide">{t("planLogicTitle")}</div>
            <p className="text-sm leading-relaxed text-[var(--text)]">{t("planLogicText")}</p>
          </div>
          <div className="panel rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">{t("weeklyGoalLabel")}</h3>
            <div className="data mb-1 text-3xl font-bold text-[var(--text)]">4 <span className="font-sans text-sm font-normal text-muted">{t("weeklyGoalDays")}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ring-track)]">
              <div className="h-full bg-accent rounded-full" style={{ width: "80%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
