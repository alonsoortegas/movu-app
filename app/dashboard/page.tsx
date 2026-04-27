import Link from "next/link";

const WEEK_DAYS = [
  { short: "L", label: "Lun", type: "pesas", emoji: "💪" },
  { short: "M", label: "Mar", type: "cardio", emoji: "🚴" },
  { short: "X", label: "Mié", type: "pesas", emoji: "💪" },
  { short: "J", label: "Jue", type: "descanso", emoji: "😴" },
  { short: "V", label: "Vie", type: "correr", emoji: "🏃", isToday: true },
  { short: "S", label: "Sáb", type: "combinado", emoji: "🔄" },
  { short: "D", label: "Dom", type: "—", emoji: "—" },
];

const RECENT_WORKOUTS = [
  { name: "Spinning", studio: "Cyclo Studio", duration: "45 min", emoji: "🚴" },
  { name: "Pesas — Pierna", studio: "Gym Club", duration: "60 min", emoji: "💪" },
  { name: "Barre", studio: "Studio MX", duration: "50 min", emoji: "🩰" },
];

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 md:mb-8">
        <div>
          {/* Mobile greeting */}
          <h1 className="text-xl font-bold text-[#111] md:hidden">Hola, Ana 👋</h1>
          {/* Desktop heading */}
          <h1 className="hidden md:block text-2xl font-bold text-[#111]">Dashboard</h1>
          <p className="text-xs md:text-sm text-muted mt-0.5">Semana del 14–20 Abr · 2025</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Avatar on mobile */}
          <div className="w-9 h-9 rounded-full bg-[#eee] border border-[#e0e0e0] flex items-center justify-center text-base md:hidden">
            🧑
          </div>
          <Link
            href="/registro"
            className="hidden md:block bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            + Registrar hoy
          </Link>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-4 md:p-5 mb-4 md:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-accent text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
            IA
          </span>
          <span className="text-xs font-semibold text-[#555]">Insight de hoy</span>
        </div>
        <p className="text-sm text-[#333] leading-relaxed">
          &ldquo;Hoy es buen día para intensidad alta — dormiste bien y tu carga semanal es baja. Considera una sesión de pesas o HIIT.&rdquo;
        </p>
      </div>

      {/* Week strip */}
      <div className="mb-4 md:mb-6">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 md:mb-3">Esta semana</p>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {WEEK_DAYS.map((day) => (
            <div
              key={day.short}
              className={`rounded-xl border p-2 md:p-3 text-center transition-all ${
                day.isToday
                  ? "bg-accent-light border-accent shadow-sm"
                  : "bg-surface border-border"
              }`}
            >
              <div className={`text-[10px] md:text-xs font-medium mb-1 ${day.isToday ? "text-[#555]" : "text-muted"}`}>
                {day.short}
              </div>
              <div className="text-sm md:text-lg mb-0.5 md:mb-1">{day.emoji}</div>
              <div className={`text-[9px] leading-tight hidden md:block ${day.isToday ? "text-[#444] font-medium" : "text-muted"}`}>
                {day.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        {[
          { emoji: "💤", label: "Sueño", value: "7h 20m", sub: "Buena calidad" },
          { emoji: "🔥", label: "Calorías", value: "420 kcal", sub: "" },
          { emoji: "⏱", label: "Tiempo", value: "55 min", sub: "" },
        ].map(({ emoji, label, value, sub }) => (
          <div
            key={label}
            className="bg-surface border border-border rounded-xl p-3 md:p-5 text-center md:text-left"
          >
            <div className="text-lg md:text-2xl mb-1 md:mb-2">{emoji}</div>
            <div className="text-[10px] md:text-xs text-muted mb-0.5 md:mb-1">{label}</div>
            <div className="text-sm md:text-2xl font-bold text-[#111] leading-tight">{value}</div>
            {sub && <div className="text-[10px] text-muted mt-0.5 hidden md:block">{sub}</div>}
          </div>
        ))}
      </div>

      {/* Recent workouts */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2 md:mb-3">
          Últimos entrenamientos
        </h2>
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {RECENT_WORKOUTS.map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4 ${
                i < RECENT_WORKOUTS.length - 1 ? "border-b border-dashed border-border" : ""
              }`}
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-lg bg-accent-light border border-accent flex items-center justify-center text-base flex-shrink-0">
                {w.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#111] truncate">{w.name}</div>
                <div className="text-xs text-muted">{w.studio} · {w.duration}</div>
              </div>
              <span className="text-muted text-sm">›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom section — desktop only */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Progreso semanal</h3>
          <div className="space-y-2.5">
            {[
              { label: "Entrenamientos", val: 4, max: 5 },
              { label: "Minutos activos", val: 220, max: 300 },
              { label: "Calorías", val: 1680, max: 2000 },
            ].map(({ label, val, max }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#555]">{label}</span>
                  <span className="text-[#888]">{val} / {max}</span>
                </div>
                <div className="h-1.5 bg-[#e8e8e8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(val / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Grupos musculares</h3>
          <div className="flex flex-wrap gap-2">
            {[["Pecho", "2x"], ["Espalda", "1x"], ["Pierna", "1x"], ["Core", "3x"], ["Cardio", "2x"]].map(([m, c]) => (
              <div
                key={m}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light border border-accent text-xs text-[#444]"
              >
                {m}
                <span className="font-bold text-accent-dark">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile CTA */}
      <Link
        href="/registro"
        className="md:hidden fixed bottom-[72px] left-4 right-4 bg-accent text-white text-sm font-semibold text-center py-3.5 rounded-xl shadow-lg"
      >
        + Registrar entrenamiento de hoy
      </Link>
    </div>
  );
}
