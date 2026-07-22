import NutritionPlanViewer from '@/components/nutrition/NutritionPlanViewer'
import { resolveNutritionPresentation, type NutritionTrackingMode } from '@/lib/nutrition/tracking-mode'

type PlanSummary = {
  id: string
  title: string
  provider_name: string | null
  calories_target: number | null
  starts_on: string
}

type TargetSummary = {
  day_type: string
  calories_target: number
  protein_target: number
  carbs_target: number
  fat_target: number
}

export default function ClientNutritionSummary({
  mode,
  plan,
  targets,
  labels,
}: {
  mode: NutritionTrackingMode
  plan: PlanSummary | null
  targets: TargetSummary[]
  labels: {
    title: string
    viewPdf: string
    missingPlan: string
    missingTargets: string
    dayTypes: Record<string, string>
    protein: string
    carbs: string
    fat: string
  }
}) {
  const presentation = resolveNutritionPresentation({
    mode,
    hasActivePlan: Boolean(plan),
    hasTargets: targets.length > 0,
  })

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="font-semibold text-[var(--text)]">{labels.title}</h2>
      {presentation.state === 'missing_plan' && (
        <p className="mt-3 text-sm text-muted">{labels.missingPlan}</p>
      )}
      {presentation.state === 'missing_targets' && (
        <p className="mt-3 text-sm text-muted">{labels.missingTargets}</p>
      )}
      {presentation.primary === 'plan_document' && presentation.state === 'ready' && plan && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{plan.title}</p>
            <p className="mt-1 text-xs text-muted">
              {plan.provider_name || '—'} · {plan.calories_target || '—'} kcal · {plan.starts_on}
            </p>
          </div>
          <NutritionPlanViewer planId={plan.id} label={labels.viewPdf} />
        </div>
      )}
      {presentation.primary === 'macro_targets' && presentation.state === 'ready' && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {targets.map((target) => (
            <div key={target.day_type} className="rounded-xl border border-[var(--border)] bg-[var(--ink-03)] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                {labels.dayTypes[target.day_type] ?? target.day_type}
              </p>
              <p className="mt-2 text-lg font-bold text-[var(--text)]">{target.calories_target} kcal</p>
              <p className="mt-2 text-xs text-muted">
                {labels.protein} {target.protein_target}g · {labels.carbs} {target.carbs_target}g · {labels.fat} {target.fat_target}g
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
