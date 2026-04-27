"use client";

import { useState } from "react";

export default function PerfilPage() {
  const [name, setName] = useState("Ana García");
  const [goal, setGoal] = useState("Perder grasa y ganar músculo");
  const [muscleMass, setMuscleMass] = useState("28.4");
  const [bodyFat, setBodyFat] = useState("22.5");
  const [weeklyGoal, setWeeklyGoal] = useState("5");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-[#111]">Perfil</h1>
        <p className="text-xs md:text-sm text-muted mt-0.5">Tus datos y metas de entrenamiento</p>
      </div>

      {/* Avatar + name banner */}
      <div className="flex items-center gap-4 mb-6 p-4 md:p-6 bg-surface border border-border rounded-xl">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-accent-light border-2 border-accent flex items-center justify-center text-2xl md:text-3xl flex-shrink-0">
          🏋️
        </div>
        <div>
          <div className="text-base md:text-lg font-bold text-[#111]">{name}</div>
          <div className="text-xs md:text-sm text-muted">{goal}</div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 md:space-y-8">
        {/* Personal info */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">
            Información personal
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">Objetivo principal</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-4 py-3 h-11 md:h-auto text-sm text-[#111] outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
              >
                <option>Perder grasa y ganar músculo</option>
                <option>Ganar músculo</option>
                <option>Perder peso</option>
                <option>Mejorar resistencia</option>
                <option>Mantenerme activo/a</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#444] mb-2">
                Meta semanal de entrenamientos
              </label>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWeeklyGoal(String(n))}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                      weeklyGoal === String(n)
                        ? "bg-accent-light border-accent text-[#333]"
                        : "bg-surface border-border text-muted hover:border-[#ccc]"
                    }`}
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* InBody data */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">Datos InBody</h2>
            <span className="text-[10px] bg-accent-light text-accent-dark border border-accent px-2 py-0.5 rounded-full font-medium">
              Última: 10 Abr
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
            <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
              <div className="text-xs text-muted mb-1">Masa muscular</div>
              <div className="flex items-end gap-1">
                <input
                  type="number"
                  value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)}
                  step="0.1"
                  className="text-xl md:text-2xl font-bold text-[#111] w-16 bg-transparent outline-none border-b-2 border-transparent focus:border-accent"
                />
                <span className="text-sm text-muted mb-0.5">kg</span>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
              <div className="text-xs text-muted mb-1">Grasa corporal</div>
              <div className="flex items-end gap-1">
                <input
                  type="number"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  step="0.1"
                  className="text-xl md:text-2xl font-bold text-[#111] w-16 bg-transparent outline-none border-b-2 border-transparent focus:border-accent"
                />
                <span className="text-sm text-muted mb-0.5">%</span>
              </div>
            </div>
          </div>

          {/* Body composition bar */}
          <div className="bg-surface border border-border rounded-xl p-4 md:p-5">
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>Composición corporal</span>
              <span>Músculo {muscleMass}kg · Grasa {bodyFat}%</span>
            </div>
            <div className="h-3 bg-[#e8e8e8] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-accent rounded-l-full"
                style={{ width: `${(parseFloat(muscleMass) / 60) * 100}%` }}
              />
              <div
                className="h-full bg-[#f07840]"
                style={{ width: `${parseFloat(bodyFat)}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <div className="w-2.5 h-2.5 rounded-sm bg-accent" /> Músculo
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#f07840]" /> Grasa
              </div>
            </div>
          </div>
        </section>

        {/* Save — desktop inline, mobile pinned */}
        <button
          type="submit"
          className={`hidden md:block w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
            saved ? "bg-[#4caf50] text-white" : "bg-accent hover:bg-accent-dark text-white shadow-sm"
          }`}
        >
          {saved ? "✓ Perfil guardado" : "Guardar cambios"}
        </button>
      </form>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-[72px] left-4 right-4">
        <button
          onClick={handleSave}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold shadow-lg transition-all ${
            saved ? "bg-[#4caf50] text-white" : "bg-accent text-white"
          }`}
        >
          {saved ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
