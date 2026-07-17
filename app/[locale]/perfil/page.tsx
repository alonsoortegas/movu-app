"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";

const GOAL_KEYS = ["loseGainMuscle", "gainMuscle", "loseWeight", "endurance", "stayActive"] as const;
const SEX_KEYS = ["female", "male", "other", "prefer_not_to_say"] as const;

const BODY_FIELD_KEYS = [
  "weight_kg",
  "muscle_mass_kg",
  "fat_percentage",
  "fat_mass_kg",
  "visceral_fat_level",
  "bmr_kcal",
  "phase_angle",
  "total_body_water_l",
  "protein_kg",
  "mineral_kg",
  "waist_hip_ratio",
  "muscle_left_arm",
  "muscle_right_arm",
  "muscle_left_leg",
  "muscle_right_leg",
  "muscle_trunk",
] as const;

type BodyFieldKey = (typeof BODY_FIELD_KEYS)[number];

type BodyMeasurement = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  muscle_mass_kg: number | null;
  fat_mass_kg: number | null;
  fat_percentage: number | null;
  visceral_fat_level: number | null;
  bmr_kcal: number | null;
  phase_angle: number | null;
  total_body_water_l: number | null;
  protein_kg: number | null;
  mineral_kg: number | null;
  waist_hip_ratio: number | null;
  muscle_left_arm: number | null;
  muscle_right_arm: number | null;
  muscle_left_leg: number | null;
  muscle_right_leg: number | null;
  muscle_trunk: number | null;
  notes: string | null;
};

type BodyCompForm = Record<BodyFieldKey, string> & {
  measured_at: string;
  notes: string;
};

type WhoopStatus = {
  connected: boolean;
  reauth_required: boolean;
  data_source: string | null;
};

const emptyBodyCompForm = (): BodyCompForm => ({
  measured_at: new Date().toISOString().slice(0, 10),
  weight_kg: "",
  muscle_mass_kg: "",
  fat_percentage: "",
  fat_mass_kg: "",
  visceral_fat_level: "",
  bmr_kcal: "",
  phase_angle: "",
  total_body_water_l: "",
  protein_kg: "",
  mineral_kg: "",
  waist_hip_ratio: "",
  muscle_left_arm: "",
  muscle_right_arm: "",
  muscle_left_leg: "",
  muscle_right_leg: "",
  muscle_trunk: "",
  notes: "",
});

function formFromMeasurement(measurement: BodyMeasurement | null): BodyCompForm {
  const form = emptyBodyCompForm();
  if (!measurement) return form;

  form.measured_at = measurement.measured_at?.slice(0, 10) || form.measured_at;
  form.notes = measurement.notes ?? "";
  for (const key of BODY_FIELD_KEYS) {
    const value = measurement[key];
    form[key] = value === null || value === undefined ? "" : String(value);
  }
  return form;
}

function numeric(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function display(value: number | null | undefined, digits = 1) {
  return typeof value === "number" ? value.toFixed(digits) : "—";
}

function delta(current: string, previous: number | null | undefined, invert = false) {
  const currentValue = numeric(current);
  if (currentValue === null || typeof previous !== "number") return null;
  const value = currentValue - previous;
  if (Math.abs(value) < 0.05) return { label: "0.0", good: true };
  return { label: `${value > 0 ? "+" : ""}${value.toFixed(1)}`, good: invert ? value < 0 : value > 0 };
}

function bodyCompSignature(form: BodyCompForm) {
  return JSON.stringify(form);
}

export default function PerfilPage() {
  const t = useTranslations("perfil");
  const [name, setName] = useState("");
  const [sex, setSex] = useState("");
  const [goal, setGoal] = useState("loseGainMuscle");
  const [maxHr, setMaxHr] = useState("");
  const [weeklyGoal, setWeeklyGoal] = useState("5");
  const [bodyComp, setBodyComp] = useState<BodyCompForm>(() => emptyBodyCompForm());
  const [bodyHistory, setBodyHistory] = useState<BodyMeasurement[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string | null>(null);
  const [whoopStatus, setWhoopStatus] = useState<WhoopStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [appleImporting, setAppleImporting] = useState(false);
  const [appleImportDone, setAppleImportDone] = useState(false);
  const [appleImportError, setAppleImportError] = useState<string | null>(null);
  const appleFileRef = useRef<HTMLInputElement>(null);
  const initialBodyComp = useRef(bodyCompSignature(emptyBodyCompForm()));

  const previousMeasurement = bodyHistory[1] ?? null;
  const muscleDelta = delta(bodyComp.muscle_mass_kg, previousMeasurement?.muscle_mass_kg);
  const fatDelta = delta(bodyComp.fat_percentage, previousMeasurement?.fat_percentage, true);
  const weightDelta = delta(bodyComp.weight_kg, previousMeasurement?.weight_kg, true);
  const visceralDelta = delta(bodyComp.visceral_fat_level, previousMeasurement?.visceral_fat_level, true);
  const whoopNeedsReconnect = Boolean(
    dataSource === "whoop" && (whoopStatus?.reauth_required || syncError === "whoop_reauth_required"),
  );

  const latestScanLabel = useMemo(() => {
    if (!bodyHistory[0]?.measured_at) return t("noMeasurements");
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(bodyHistory[0].measured_at));
  }, [bodyHistory, t]);

  useEffect(() => {
    Promise.all([
      fetch("/api/me").then((r) => r.json()),
      fetch("/api/body-measurements").then((r) => r.json()),
    ])
      .then(([profile, measurements]) => {
        if (profile.full_name) setName(profile.full_name);
        if (profile.sex) setSex(profile.sex);
        if (profile.goal) setGoal(profile.goal);
        if (profile.max_hr_bpm) setMaxHr(String(profile.max_hr_bpm));
        if (profile.data_source) setDataSource(profile.data_source);

        const history = measurements.measurements ?? [];
        setBodyHistory(history);
        const nextBodyComp = formFromMeasurement(measurements.latest ?? profile.body_comp ?? null);
        setBodyComp(nextBodyComp);
        initialBodyComp.current = bodyCompSignature(nextBodyComp);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/whoop/status")
      .then((r) => r.json())
      .then((data: WhoopStatus) => setWhoopStatus(data))
      .catch(() => {});
  }, []);

  const updateBodyComp = (key: keyof BodyCompForm, value: string) => {
    setBodyComp((current) => ({ ...current, [key]: value }));
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncDone(false);
    setSyncError(null);
    try {
      const res = await fetch("/api/whoop/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setSyncDone(true);
      setWhoopStatus((current) => current ? { ...current, reauth_required: false } : current);
      setTimeout(() => setSyncDone(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setSyncError(message);
      if (message === "whoop_reauth_required") {
        setWhoopStatus((current) => current ? { ...current, reauth_required: true } : current);
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleAppleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setAppleImportError(null);
    setAppleImporting(true);
    setAppleImportDone(false);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/apple-health/import", { method: "POST", body: form });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Import failed");
      }
      setAppleImportDone(true);
      setDataSource("apple_health");
      setTimeout(() => setAppleImportDone(false), 4000);
    } catch (err) {
      setAppleImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setAppleImporting(false);
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
          sex: sex || null,
          goal,
          max_hr_bpm: maxHr ? parseInt(maxHr) : undefined,
        }),
      });
      if (!patchRes.ok) {
        const d = await patchRes.json();
        throw new Error(d.error ?? "Failed to save profile");
      }

      const currentSignature = bodyCompSignature(bodyComp);
      const hasBodyValue = BODY_FIELD_KEYS.some((key) => bodyComp[key] !== "") || bodyComp.notes.trim() !== "";
      if (currentSignature !== initialBodyComp.current && hasBodyValue) {
        const payload = BODY_FIELD_KEYS.reduce<Record<string, number | string | null>>((acc, key) => {
          acc[key] = numeric(bodyComp[key]);
          return acc;
        }, {
          measured_at: bodyComp.measured_at,
          notes: bodyComp.notes,
        });

        const measRes = await fetch("/api/body-measurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await measRes.json();
        if (!measRes.ok) throw new Error(d.error ?? "Failed to save body measurements");

        const updatedHistory = [d.measurement, ...bodyHistory].slice(0, 8);
        setBodyHistory(updatedHistory);
        const nextBodyComp = formFromMeasurement(d.measurement);
        setBodyComp(nextBodyComp);
        initialBodyComp.current = bodyCompSignature(nextBodyComp);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    { key: "weight_kg", label: t("fields.weight"), unit: "kg", change: weightDelta },
    { key: "muscle_mass_kg", label: t("fields.muscleMass"), unit: "kg", change: muscleDelta },
    { key: "fat_percentage", label: t("fields.bodyFat"), unit: "%", change: fatDelta },
    { key: "fat_mass_kg", label: t("fields.fatMass"), unit: "kg", change: null },
  ] as const;

  const trainingFields = [
    { key: "visceral_fat_level", label: t("fields.visceralFat"), unit: "", change: visceralDelta, placeholder: "8" },
    { key: "bmr_kcal", label: t("fields.bmr"), unit: "kcal", placeholder: "1650", change: null },
    { key: "phase_angle", label: t("fields.phaseAngle"), unit: "°", placeholder: "6.2", change: null },
    { key: "total_body_water_l", label: t("fields.bodyWater"), unit: "L", placeholder: "42.0", change: null },
    { key: "protein_kg", label: t("fields.protein"), unit: "kg", placeholder: "12.4", change: null },
    { key: "mineral_kg", label: t("fields.minerals"), unit: "kg", placeholder: "3.8", change: null },
    { key: "waist_hip_ratio", label: t("fields.waistHip"), unit: "", placeholder: "0.82", change: null },
  ] as const;

  const segmentFields = [
    { key: "muscle_left_arm", label: t("fields.leftArm") },
    { key: "muscle_right_arm", label: t("fields.rightArm") },
    { key: "muscle_trunk", label: t("fields.trunk") },
    { key: "muscle_left_leg", label: t("fields.leftLeg") },
    { key: "muscle_right_leg", label: t("fields.rightLeg") },
  ] as const;

  return (
    <div className="boot p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-5 md:mb-8">
        <h1 className="display text-xl font-bold text-[var(--text)] md:text-2xl">{t("title")}</h1>
        <p className="text-xs md:text-sm text-muted mt-0.5">{t("subtitle")}</p>
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 md:p-6 panel rounded-2xl">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent-light border-2 border-accent flex items-center justify-center text-2xl md:text-3xl flex-shrink-0">🏋️</div>
        <div>
          <div className="text-base md:text-lg font-bold text-[var(--text)]">{name}</div>
          <div className="text-xs md:text-sm text-muted">{t(`goals.${goal}`)}</div>
        </div>
      </div>

      <div className="glass ticks mb-6 rounded-2xl border border-[var(--border-hi)] p-4">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Data source</h2>
        {dataSource === "whoop" && whoopStatus?.connected && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${whoopNeedsReconnect ? "border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.12)] text-[var(--coral)]" : "border-accent bg-accent-light text-accent-dark"}`}>
              {whoopNeedsReconnect ? "WHOOP reconnect required" : "WHOOP connected"}
            </span>
            <div className="flex flex-col items-end gap-1">
              {whoopNeedsReconnect ? (
                <a href="/api/whoop/connect" className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold">Reconnect WHOOP</a>
              ) : (
                <button type="button" onClick={handleSync} disabled={syncing} className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
                  {syncing ? "Syncing…" : syncDone ? "Done" : "Sync now"}
                </button>
              )}
              {syncError && !whoopNeedsReconnect && <p className="text-xs text-red-500">{syncError}</p>}
            </div>
          </div>
        )}
        {dataSource === "whoop" && !whoopStatus?.connected && whoopStatus?.reauth_required && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.12)] px-3 py-1 text-xs font-semibold text-[var(--amber)]">Reconnect required</span>
            <a href="/api/whoop/connect" className="text-sm font-medium px-4 py-2 rounded-lg border border-border text-[var(--text-dim)] hover:border-[var(--border-hi)] transition-all">Reconnect WHOOP</a>
          </div>
        )}
        {dataSource === "apple_health" && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent-light border border-accent text-accent-dark px-3 py-1 rounded-full">Apple Health connected</span>
            <div className="flex flex-col items-end gap-1">
              <button type="button" onClick={() => appleFileRef.current?.click()} disabled={appleImporting} className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">
                {appleImporting ? "Importing…" : appleImportDone ? "Imported!" : "Import file"}
              </button>
              {appleImportError && <p className="text-xs text-red-500">{appleImportError}</p>}
            </div>
          </div>
        )}
        {!dataSource && (
          <div className="flex gap-3 flex-wrap">
            <a href="/api/whoop/connect" className="flex-1 min-w-[120px] py-2.5 rounded-lg border-2 border-accent bg-accent-light text-sm font-semibold text-center text-[var(--text)] hover:bg-accent hover:text-white transition-all">WHOOP</a>
            <button type="button" onClick={() => appleFileRef.current?.click()} disabled={appleImporting} title="Large exports can take 30–60 seconds" className="flex-1 min-w-[120px] py-2.5 rounded-lg border-2 border-border text-sm font-semibold text-[var(--text)] hover:border-accent hover:bg-accent-light transition-all disabled:opacity-60">
              {appleImporting ? "Importing…" : appleImportDone ? "Imported!" : "Apple Health"}
            </button>
            <button type="button" disabled className="flex-1 min-w-[120px] py-2.5 rounded-lg border-2 border-border text-sm font-semibold text-muted cursor-not-allowed">Manual</button>
          </div>
        )}
        {!dataSource && appleImportError && <p className="text-xs text-red-500 mt-2">{appleImportError}</p>}
        <input ref={appleFileRef} type="file" accept=".xml" className="hidden" onChange={handleAppleImport} />
      </div>

      <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
        <section className="panel rounded-2xl p-4 md:p-5">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">{t("personalInfo")}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("nameLabel")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("goalLabel")}</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all">
                {GOAL_KEYS.map((key) => <option key={key} value={key}>{t(`goals.${key}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("sexLabel")}</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all">
                <option value="">{t("sexPlaceholder")}</option>
                {SEX_KEYS.map((key) => <option key={key} value={key}>{t(`sexOptions.${key}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">Max HR</label>
              <input type="number" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} placeholder="e.g. 185" min={100} max={220} className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("weeklyGoal")}</label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} type="button" onClick={() => setWeeklyGoal(String(n))} className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${weeklyGoal === String(n) ? "bg-accent-light border-accent text-[var(--text)]" : "bg-surface border-border text-muted hover:border-[var(--border-hi)]"}`}>
                    {n}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">{t("inbody")}</h2>
              <p className="text-xs text-muted mt-1">{t("inbodySubtitle")}</p>
            </div>
            <span className="text-[10px] bg-accent-light text-accent-dark border border-accent px-2 py-0.5 rounded-full font-medium">{t("lastMeasurement", { date: latestScanLabel })}</span>
          </div>

          <div className="panel rounded-2xl p-4 md:p-5">
            <label className="block text-sm font-medium text-[var(--text-dim)] mb-2">{t("fields.scanDate")}</label>
            <input type="date" value={bodyComp.measured_at} onChange={(e) => updateBodyComp("measured_at", e.target.value)} className="w-full md:w-56 bg-[var(--surface)] border border-border rounded-lg px-4 py-3 h-11 text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {metricCards.map((field) => (
              <div key={field.key} className="panel rounded-2xl p-4 md:p-5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs text-muted">{field.label}</label>
                  {field.change && (
                    <span className={`text-[11px] font-semibold ${field.change.good ? "text-accent-dark" : "text-[var(--coral)]"}`}>
                      {field.change.label}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1">
                  <input type="number" value={bodyComp[field.key]} onChange={(e) => updateBodyComp(field.key, e.target.value)} step="0.1" className="text-xl md:text-2xl font-bold text-[var(--text)] w-full min-w-0 bg-transparent outline-none border-b-2 border-transparent focus:border-accent" />
                  <span className="text-sm text-muted mb-0.5">{field.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.25fr_0.75fr] gap-4">
            <div className="panel rounded-2xl p-4 md:p-5">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3">{t("trainingMarkers")}</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {trainingFields.map((field) => (
                  <label key={field.key} className="block">
                    <span className="flex items-center justify-between text-xs text-muted mb-1.5">
                      {field.label}
                      {field.change && <span className={`font-semibold ${field.change.good ? "text-accent-dark" : "text-[var(--coral)]"}`}>{field.change.label}</span>}
                    </span>
                    <div className="flex items-center gap-2 bg-[var(--surface)] border border-border rounded-lg px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all">
                      <input type="number" value={bodyComp[field.key]} onChange={(e) => updateBodyComp(field.key, e.target.value)} step="0.1" placeholder={field.placeholder} className="w-full min-w-0 bg-transparent outline-none text-sm text-[var(--text)]" />
                      {field.unit && <span className="text-xs text-muted">{field.unit}</span>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="panel rounded-2xl p-4 md:p-5">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3">{t("segmentalMuscle")}</h3>
              <div className="space-y-3">
                {segmentFields.map((field) => (
                  <label key={field.key} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">{field.label}</span>
                    <div className="flex items-center gap-2 w-28 bg-[var(--surface)] border border-border rounded-lg px-3 py-2 focus-within:border-accent transition-all">
                      <input type="number" value={bodyComp[field.key]} onChange={(e) => updateBodyComp(field.key, e.target.value)} step="0.1" className="w-full min-w-0 bg-transparent outline-none text-sm text-[var(--text)]" />
                      <span className="text-xs text-muted">kg</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="panel rounded-2xl p-4 md:p-5">
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>{t("bodyComp")}</span>
              <span>{t("muscle")} {bodyComp.muscle_mass_kg || "—"}kg · {t("fat")} {bodyComp.fat_percentage || "—"}%</span>
            </div>
            <div className="h-3 bg-[var(--ring-track)] rounded-full overflow-hidden flex">
              <div className="h-full bg-accent rounded-l-full" style={{ width: `${Math.min((parseFloat(bodyComp.muscle_mass_kg || "0") / 60) * 100, 100)}%` }} />
              <div className="h-full bg-[var(--coral)]" style={{ width: `${Math.min(parseFloat(bodyComp.fat_percentage || "0"), 100)}%` }} />
            </div>
            <textarea value={bodyComp.notes} onChange={(e) => updateBodyComp("notes", e.target.value)} placeholder={t("notesPlaceholder")} className="mt-4 w-full min-h-20 bg-[var(--surface)] border border-border rounded-lg px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
          </div>

          {bodyHistory.length > 0 && (
            <div className="panel rounded-2xl overflow-hidden">
              <div className="px-4 md:px-5 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text)]">{t("recentScans")}</h3>
                <span className="text-xs text-muted">{bodyHistory.length}</span>
              </div>
              <div className="divide-y divide-border">
                {bodyHistory.map((scan) => (
                  <div key={scan.id} className="grid grid-cols-4 gap-3 px-4 md:px-5 py-3 text-xs">
                    <div className="font-medium text-[var(--text)]">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(scan.measured_at))}</div>
                    <div><span className="text-muted">{t("fields.weight")}</span> <span className="font-semibold text-[var(--text)]">{display(scan.weight_kg)}kg</span></div>
                    <div><span className="text-muted">{t("fields.muscleMass")}</span> <span className="font-semibold text-[var(--text)]">{display(scan.muscle_mass_kg)}kg</span></div>
                    <div><span className="text-muted">{t("fields.bodyFat")}</span> <span className="font-semibold text-[var(--text)]">{display(scan.fat_percentage)}%</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div>
          {saveError && <p className="text-sm text-red-500 mb-2">{saveError}</p>}
          <button type="submit" disabled={loading} className={`hidden w-full rounded-xl py-3.5 text-sm font-semibold transition-all disabled:opacity-60 md:block ${saved ? "bg-[#4caf50] text-white" : "btn-accent"}`}>
            {loading ? "Saving…" : saved ? t("saved") : t("save")}
          </button>
        </div>
      </form>

      <div className="fixed left-4 right-4 z-40 md:hidden" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}>
        {saveError && <p className="text-sm text-red-500 mb-2 text-center">{saveError}</p>}
        <button onClick={handleSave} disabled={loading} className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition-all disabled:opacity-60 ${saved ? "bg-[#4caf50] text-white" : "btn-accent"}`}>
          {loading ? "Saving…" : saved ? t("savedShort") : t("save")}
        </button>
      </div>
    </div>
  );
}
