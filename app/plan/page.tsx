const PLAN_ROWS = [
  { day: "Lunes", muscle: "Pecho + Tríceps", type: "Pesas", durationMin: 50 },
  { day: "Martes", muscle: "Pierna", type: "Pesas", durationMin: 60 },
  { day: "Miércoles", muscle: "Cardio HIIT", type: "Cardio", durationMin: 40 },
  { day: "Jueves", muscle: "Descanso", type: "—", durationMin: 0 },
  { day: "Viernes", muscle: "Espalda + Bícep", type: "Pesas", durationMin: 55 },
  { day: "Sábado", muscle: "Full Body", type: "Combinado", durationMin: 60 },
  { day: "Domingo", muscle: "Descanso", type: "—", durationMin: 0 },
];

const MUSCLE_BADGES = [
  { emoji: "💪", label: "Pecho", count: "2x" },
  { emoji: "🦵", label: "Pierna", count: "1x" },
  { emoji: "🫀", label: "Cardio", count: "2x" },
  { emoji: "🔙", label: "Espalda", count: "1x" },
  { emoji: "⭕", label: "Core", count: "—" },
];

const VOLUME_BARS = [
  { label: "Pecho / Tríceps", pct: 60 },
  { label: "Pierna", pct: 80 },
  { label: "Espalda / Bícep", pct: 40 },
  { label: "Core", pct: 55 },
  { label: "Cardio", pct: 65 },
];

const TYPE_PILL: Record<string, string> = {
  Pesas: "bg-accent-light text-[#444] border-accent",
  Cardio: "bg-[#ffefd4] text-[#666] border-[#f0c870]",
  Combinado: "bg-[#f0d4ff] text-[#664] border-[#c890e8]",
  "—": "",
};

export default function PlanPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Mi Plan Semanal</h1>
          <p className="text-sm text-muted mt-0.5">Generado por IA · Semana 14–20 Abr</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent-light border border-accent rounded-lg text-sm font-medium text-[#444] hover:bg-[#c0f0a0] transition-colors">
          ✨ Regenerar plan
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Table + badges */}
        <div className="col-span-2 space-y-6">
          {/* Weekly table */}
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[100px_1fr_100px_60px] bg-surface border-b border-border px-5 py-3">
              {["Día", "Grupo Muscular", "Tipo", "Min"].map((h) => (
                <div key={h} className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {h}
                </div>
              ))}
            </div>

            {PLAN_ROWS.map((row, i) => (
              <div
                key={row.day}
                className={`grid grid-cols-[100px_1fr_100px_60px] px-5 py-3.5 items-center ${
                  i < PLAN_ROWS.length - 1 ? "border-b border-dashed border-border" : ""
                } ${row.type === "—" ? "opacity-50" : i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"}`}
              >
                <div className="text-sm font-medium text-[#333]">{row.day}</div>
                <div className="text-sm text-[#444]">{row.muscle}</div>
                <div>
                  {row.type !== "—" ? (
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${TYPE_PILL[row.type] || "bg-surface border-border text-muted"}`}
                    >
                      {row.type}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">—</span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {row.durationMin > 0 ? `${row.durationMin}` : ""}
                </div>
              </div>
            ))}
          </div>

          {/* Muscle group badges */}
          <div>
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Grupos musculares esta semana
            </h3>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_BADGES.map(({ emoji, label, count }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-border rounded-full text-xs text-[#444]"
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span className="font-bold text-accent-dark">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: volume bars + AI */}
        <div className="space-y-6">
          {/* Volume */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
              Volumen semanal
            </h3>
            <div className="space-y-3">
              {VOLUME_BARS.map(({ label, pct }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#555]">{label}</span>
                    <span className="text-muted">{pct}%</span>
                  </div>
                  <div className="h-2 bg-[#e8e8e8] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI logic */}
          <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-5">
            <div className="text-xs font-bold text-accent-dark mb-2 tracking-wide">
              ✨ LÓGICA DEL PLAN
            </div>
            <p className="text-sm text-[#444] leading-relaxed">
              Basado en tu historial, priorizamos pierna y espalda. Cardio intercalado para recuperación activa. Dos días de descanso para evitar sobreentrenamiento.
            </p>
          </div>

          {/* Weekly goal */}
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
              Meta semanal
            </h3>
            <div className="text-3xl font-bold text-[#111] mb-1">
              4 <span className="text-sm font-normal text-muted">/ 5 días</span>
            </div>
            <div className="h-2 bg-[#e8e8e8] rounded-full overflow-hidden mt-2">
              <div className="h-full bg-accent rounded-full" style={{ width: "80%" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
