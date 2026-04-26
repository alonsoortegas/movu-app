"use client";

import { useState } from "react";

const CLASS_TYPES = [
  { value: "pesas", label: "Pesas", emoji: "💪" },
  { value: "cardio", label: "Cardio", emoji: "🚴" },
  { value: "correr", label: "Correr", emoji: "🏃" },
  { value: "combinado", label: "Combinado", emoji: "🔄" },
  { value: "bootcamp", label: "Bootcamp", emoji: "🥊" },
  { value: "taller", label: "Taller", emoji: "📚" },
];

const EFFORT_LABELS = ["", "Muy suave", "Suave", "Moderado", "Intenso", "Máximo"];

export default function RegistroPage() {
  const [type, setType] = useState("pesas");
  const [className, setClassName] = useState("");
  const [studio, setStudio] = useState("");
  const [duration, setDuration] = useState("");
  const [calories, setCalories] = useState("");
  const [distance, setDistance] = useState("");
  const [effort, setEffort] = useState(3);
  const [saved, setSaved] = useState(false);

  const showDistance = type === "correr" || type === "cardio";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#111]">Registrar entrenamiento</h1>
        <p className="text-sm text-muted mt-0.5">Lunes 21 de Abril</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tipo de clase */}
        <div>
          <label className="block text-sm font-medium text-[#444] mb-3">
            Tipo de clase
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {CLASS_TYPES.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                  type === value
                    ? "bg-accent-light border-accent shadow-sm"
                    : "bg-surface border-border hover:border-[#ccc]"
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className={`text-xs font-medium ${type === value ? "text-[#444]" : "text-muted"}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nombre de la clase */}
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">
            Nombre de la clase
          </label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            placeholder="ej. Spinning, Barre, HIIT..."
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* Estudio */}
        <div>
          <label className="block text-sm font-medium text-[#444] mb-2">
            Estudio o lugar
          </label>
          <input
            type="text"
            value={studio}
            onChange={(e) => setStudio(e.target.value)}
            placeholder="ej. Cyclo Studio, Gym Club, CDMX..."
            className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* Duración + Calorías */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">
              Duración (min)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="ej. 60"
              min={0}
              max={300}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">
              Calorías
            </label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="ej. 420"
              min={0}
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-[#111] placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
        </div>

        {/* Distancia — conditional */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            showDistance ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div>
            <label className="block text-sm font-medium text-[#444] mb-2">
              Distancia en km{" "}
              <span className="text-muted font-normal text-xs">(opcional)</span>
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="ej. 5.4"
              step="0.1"
              min={0}
              className="w-full bg-accent-light border-2 border-dashed border-accent rounded-lg px-4 py-3 text-sm text-[#111] placeholder-[#999] outline-none focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
        </div>

        {/* Esfuerzo percibido */}
        <div>
          <label className="block text-sm font-medium text-[#444] mb-3">
            Esfuerzo percibido
          </label>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setEffort(n)}
                className={`flex-1 h-8 rounded-md border-2 transition-all ${
                  n <= effort
                    ? "bg-accent-light border-accent"
                    : "bg-surface border-border hover:border-[#ccc]"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>Suave</span>
            <span className="text-[#555] font-medium">{EFFORT_LABELS[effort]}</span>
            <span>Máximo</span>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all ${
              saved
                ? "bg-[#4caf50] text-white"
                : "bg-accent hover:bg-accent-dark text-white shadow-sm hover:shadow-md"
            }`}
          >
            {saved ? "✓ Entrenamiento guardado" : "Guardar entrenamiento"}
          </button>
        </div>
      </form>
    </div>
  );
}
