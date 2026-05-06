"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const GOAL_KEYS = ["loseGainMuscle", "gainMuscle", "loseWeight", "endurance", "stayActive"] as const;

type WhoopStatus = {
  connected: boolean;
  reauth_required: boolean;
  data_source: string | null;
};

export default function PerfilPage() {
  const t = useTranslations("perfil");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("loseGainMuscle");
  const [muscleMass, setMuscleMass] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [maxHr, setMaxHr] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("5");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [whoopStatus, setWhoopStatus] = useState<WhoopStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const initialBodyComp = useRef<{ muscleMass: string; bodyFat: string } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.full_name) setName(data.full_name);
        if (data.goal) setGoal(data.goal);
        if (data.max_hr_bpm) setMaxHr(String(data.max_hr_bpm));
        if (data.data_source) setDataSource(data.data_source);
        if (data.body_comp) {
          const m = String(data.body_comp.muscle_mass_kg ?? "");
          const f = String(data.body_comp.fat_percentage ?? "");
          setMuscleMass(m);
          setBodyFat(f);
          initialBodyComp.current = { muscleMass: m, bodyFat: f };
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/whoop/status")
      .then((r) => r.json())
      .then((data: WhoopStatus) => setWhoopStatus(data))
      .catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncDone(false);
    try {
      await fetch("/api/whoop/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 25 }),
      });
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setLoading(true);
    try {
      const patchRes = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          goal,
          max_hr_bpm: maxHr ? parseInt(maxHr) : undefined,
        }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json();
        throw new Error(d.error ?? "Failed to save profile");
      }

      const bodyCompChanged =
        initialBodyComp.current === null ||
        muscleMass !== initialBodyComp.current.muscleMass ||
        bodyFat !== initialBodyComp.current.bodyFat;

      if (bodyCompChanged && muscleMass && bodyFat) {
        const measRes = await fetch("/api/body-measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            muscle_mass_kg: parseFloat(muscleMass),
            fat_percentage: parseFloat(bodyFat),
          }),
        });
        if (!measRes.ok) {
          const d = await measRes.json();
          throw new Error(d.error ?? "Failed to save body measurements");
        }
        initialBodyComp.current = { muscleMass, bodyFat };
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-[#111]">{t("title")}</h1>
        <p className="text-xs md:text-sm text-muted mt-0.5">{t("subtitle")}</p>
      </div>
      <div className="flex items-center gap-4 mb-6 p-4 md:p-6 bg-surface border border-border rounded-xl">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent-light border-2 border-accent flex items-center justify-center text-2xl md:text-3xl flex-shrink-0">🏋️</div>
        <div>
          <div className="text-base md:text-lg font-bold text-[#111]">{name}</div>
          <div className="text-xs md:text-sm text-muted">{t(`goals.${goal}`)}</div>
        </div>
      </div>
      <div className="mb-6 bg-surface border border-border rounded-xl p-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Data source</h2>
        {dataSource === "whoop" && whoopStatus?.connected && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent-light border border-accent text-accent-dark px-3 py-1 rounded-full">
              WHOOP connected
            </span>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-dark transition-all disabled:opacity-60"
            >
              {syncing ? "Syncing…" : syncDone ? "Done" : "Sync now"}
            </button>
          </div>
        )}
        {dataSource === "whoop" && whoopStatus?.reauth_required && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-1 rounded-full">
              Reconnect required
            </span>
            <a
              href="/api/whoop/connect"
              className="text-sm font-medium px-4 py-2 rounded-lg border border-border text-[#444] hover:border-[#bbb] transition-all"
            >
              Reconnect WHOOP
            </a>
          </div>
        )}
        {!dataSource && (
          <div className="flex gap-3 flex-wrap">
            <a
              href="/api/whoop/connect"
              className="flex-1 min-w-[120px] py-2.5 rounded-lg border-2 border-accent bg-accent-light text-sm font-semibold text-center text-[#333] hover:bg-accent hover:text-white transition-all"
            >
              WHOOP
            </a>
            <button
              type="button"
              disabled
              className="flex-1 min-w-[120px] py-2.5 rounded-lg border-2 border-border text-sm font-semibold text-muted cursor-not-allowed relative"
            >
              Apple Health
              <span className="ml-2 text-[10px] bg-[#f0f0f0] border border-border px-1.5 py-0.5 rounded-full align-middle">coming soon</span>
            </button>
            <button
              type="button"
              disabled
              className="flex-1 min-w-[120px] py-2.5 rounded-lg border-2 border-border text-sm font-semibold text-muted cursor-not-allowed"
            >
              Manual
            </button>
          </div>
        )}
      </div>
      <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">{t("personalInfo")}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">{t("nameLabel")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">{t("goalLabel")}</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all">
                {GOAL_KEYS.map((key) => <option key={key} value={key}>{t(`goals.${key}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">Max HR</label>
              <input type="number" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} placeholder="e.g. 185" min={100} max={220}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">{t("weeklyGoal")}</label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" onClick={() => setWeeklyGoal(String(n))}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${weeklyGoal === String(n) ? "bg-accent-light border-accent text-[#333]" : "bg-surface border-border text-muted hover:border-[#ccc]"}`}>
                    {n}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">{t("inbody")}</h2>
            <span className="text-[10px] bg-accent-light text-accent-dark border border-accent px-2 py-0.5 rounded-full font-medium">{t("lastMeasurement")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
            <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
              <div className="text-xs text-muted mb-1">{t("muscleMass")}</div>
              <div className="flex items-end gap-1">
                <input type="number" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} step="0.1"
                  className="text-xl md:text-2xl font-bold text-[#111] w-16 bg-transparent outline-none border-b-2 border-transparent focus:border-accent" />
                <span className="text-sm text-muted mb-0.5">kg</span>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
              <div className="text-xs text-muted mb-1">{t("bodyFat")}</div>
              <div className="flex items-end gap-1">
                <input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} step="0.1"
                  className="text-xl md:text-2xl font-bold text-[#111] w-16 bg-transparent outline-none border-b-2 border-transparent focus:border-accent" />
                <span className="text-sm text-muted mb-0.5">%</span>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>{t("bodyComp")}</span>
              <span>{t("muscle")} {muscleMass}kg · {t("fat")} {bodyFat}%</span>
            </div>
            <div className="h-3 bg-[#e8e8e8] rounded-full overflow-hidden flex">
              <div className="h-full bg-accent rounded-l-full" style={{ width: `${(parseFloat(muscleMass || "0") / 60) * 100}%` }} />
              <div className="h-full bg-[#f07840]" style={{ width: `${parseFloat(bodyFat || "0")}%` }} />
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted"><div className="w-2.5 h-2.5 rounded-sm bg-accent" /> {t("muscle")}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted"><div className="w-2.5 h-2.5 rounded-sm bg-[#f07840]" /> {t("fat")}</div>
            </div>
          </div>
        </section>
        <div>
          {saveError && <p className="text-sm text-red-500 mb-2">{saveError}</p>}
          <button type="submit" disabled={loading}
            className={`hidden md:block w-full py-3.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${saved ? "bg-[#4caf50] text-white" : "bg-accent hover:bg-accent-dark text-white shadow-sm"}`}>
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
    </div>
  );
}
