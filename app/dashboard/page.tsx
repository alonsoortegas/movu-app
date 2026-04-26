import Link from "next/link";

const WEEK_DAYS = [
  { short: "Lun", type: "pesas", emoji: "💪" },
  { short: "Mar", type: "cardio", emoji: "🚴" },
  { short: "Mié", type: "pesas", emoji: "💪" },
  { short: "Jue", type: "descanso", emoji: "😴" },
  { short: "Vie", type: "correr", emoji: "🏃", isToday: true },
  { short: "Sáb", type: "combinado", emoji: "🔄" },
  { short: "Dom", type: "—", emoji: "—" },
];

const RECENT_WORKOUTS = [
  { name: "Spinning", studio: "Cyclo Studio", duration: "45 min", date: "Jue" },
  { name: "Pesas — Pierna", studio: "Gym Club", duration: "60 min", date: "Mié" },
  { name: "Barre", studio: "Studio MX", duration: "50 min", date: "Mar" },
];


export default function DashboardPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#111]">Dashboard</h1>
          <p className="text-sm text-muted mt-0.5">Semana del 14–20 Abr · 2025</p>
        </div>
        <Link
          href="/registro"
          className="bg-accent hover:bg-accent-dark text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          + Registrar hoy
        </Link>
      </div>

      {/* Week strip */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {WEEK_DAYS.map((day) => (
          <div
            key={day.short}
            className={`rounded-xl border p-3 text-center transition-all ${
              day.isToday
                ? "bg-accent-light border-accent shadow-sm"
                : "bg-surface border-border"
            }`}
          >
            <div className={`text-xs font-medium mb-1.5 ${day.isToday ? "text-[#555]" : "text-muted"}`}>
              {day.short}
            </div>
            <div className="text-lg mb-1">{day.emoji}</div>
            <div className={`text-[10px] leading-tight ${day.isToday ? "text-[#444] font-medium" : "text-muted"}`}>
              {day.type}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics + AI insight */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Sueño */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-2xl mb-2">💤</div>
          <div className="text-xs text-muted mb-1">Sueño</div>
          <div className="text-2xl font-bold text-[#111]">7h 20m</div>
          <div className="text-xs text-muted mt-1">Buena calidad</div>
        </div>

        {/* Calorías */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-2xl mb-2">🔥</div>
          <div className="text-xs text-muted mb-1">Calorías quemadas</div>
          <div className="text-2xl font-bold text-[#111]">420 kcal</div>
        </div>

        {/* Tiempo */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-2xl mb-2">⏱</div>
          <div className="text-xs text-muted mb-1">Tiempo entrenado</div>
          <div className="text-2xl font-bold text-[#111]">55 min</div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-accent-light border-2 border-dashed border-accent rounded-xl p-5 mb-8">
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

      {/* Recent workouts */}
      <div>
        <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
          Últimos entrenamientos
        </h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {RECENT_WORKOUTS.map((w, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 px-5 py-4 ${
                i < RECENT_WORKOUTS.length - 1 ? "border-b border-dashed border-border" : ""
              }`}
            >
              <div className="w-9 h-9 bg-[#ebebeb] rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                💪
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#111]">{w.name}</div>
                <div className="text-xs text-muted">{w.studio}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-[#444]">{w.duration}</div>
                <div className="text-xs text-muted">{w.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly summary */}
      <div className="mt-6 grid grid-cols-2 gap-4">
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
                    className="h-full bg-accent rounded-full transition-all"
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
            {[
              ["Pecho", "2x"],
              ["Espalda", "1x"],
              ["Pierna", "1x"],
              ["Core", "3x"],
              ["Cardio", "2x"],
            ].map(([m, c]) => (
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
    </div>
  );
}
