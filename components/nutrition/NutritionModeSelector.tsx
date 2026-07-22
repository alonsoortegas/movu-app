import type { NutritionTrackingMode } from '@/lib/nutrition/tracking-mode'

export default function NutritionModeSelector({
  value,
  onChange,
  labels,
}: {
  value: NutritionTrackingMode
  onChange: (value: NutritionTrackingMode) => void
  labels: {
    title: string
    description: string
    pdf: string
    pdfDescription: string
    macros: string
    macrosDescription: string
  }
}) {
  const options: Array<{ value: NutritionTrackingMode; title: string; description: string }> = [
    { value: 'plan_document', title: labels.pdf, description: labels.pdfDescription },
    { value: 'macro_targets', title: labels.macros, description: labels.macrosDescription },
  ]

  return (
    <section className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{labels.title}</h2>
      <p className="mt-2 text-sm text-[var(--text-dim)]">{labels.description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
              value === option.value ? 'border-accent bg-accent-light' : 'border-border bg-surface'
            }`}
          >
            <input
              type="radio"
              name="nutrition_tracking_mode"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 accent-[var(--accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-[var(--text)]">{option.title}</span>
              <span className="mt-1 block text-xs text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </section>
  )
}
