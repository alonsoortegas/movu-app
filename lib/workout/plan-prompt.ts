import type { ImportedDay } from './plan-import'

export interface PlanPromptBrief {
  goal: string
  event_date: string | null
  available_days: readonly ImportedDay[]
  session_duration_min: number
  training_level: 'beginner' | 'intermediate' | 'advanced'
  equipment: string
  limitations: string
  current_performance: string
}

export interface PlanPromptContext {
  includeWeight: boolean
  weightKg: number | null
  includeSex: boolean
  sex: string | null
}

const CONTRACT_EXAMPLE = {
  schema_version: '1.0',
  name: 'Workout plan',
  start_date: '2026-08-01',
  weeks: [
    {
      week_number: 1,
      sessions: [
        {
          day_of_week: 'monday',
          title: 'Strength and stations',
          session_type: 'strength',
          notes: null,
          exercises: [
            {
              name: 'Wall balls',
              sets: 4,
              reps: '15',
              suggested_weight_kg: 6,
              target_rpe: '7',
              rest_seconds: 60,
              superset_group: null,
              is_isometric: false,
              notes: null,
            },
          ],
        },
      ],
    },
  ],
}

export function buildPlanPrompt(brief: PlanPromptBrief, context: PlanPromptContext): string {
  const reviewedContext = [
    `Goal: ${brief.goal.trim()}`,
    `Event date: ${brief.event_date || 'none'}`,
    `Available days: ${brief.available_days.join(', ')}`,
    `Maximum session duration: ${brief.session_duration_min} minutes`,
    `Training level: ${brief.training_level}`,
    `Equipment: ${brief.equipment.trim() || 'not specified'}`,
    `Limitations: ${brief.limitations.trim() || 'none reported'}`,
    `Current performance: ${brief.current_performance.trim() || 'not specified'}`,
  ]
  if (context.includeWeight && context.weightKg != null) {
    reviewedContext.push(`Body weight: ${context.weightKg} kg`)
  }
  if (context.includeSex && context.sex) reviewedContext.push(`Sex: ${context.sex}`)

  return `You are an experienced endurance and strength coach. Create a progressive workout plan from the athlete context below.

Return JSON only. Do not use markdown fences, explanations, or text before or after the JSON.

ATHLETE CONTEXT
${reviewedContext.map((line) => `- ${line}`).join('\n')}

RULES
- Use schema_version exactly "1.0".
- day_of_week must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday.
- session_type must be one of: strength, activation, cardio, other.
- Weeks must start at 1 and be consecutive.
- Include every field shown in the contract. Use null when an optional prescription is unknown.
- Use suggested_weight_kg only when the context supports a responsible suggestion; otherwise use null.
- superset_group must be a nonnegative integer or null. Exercises in the same superset use the same integer; never use letters.
- Numeric RPE must be between 1 and 10.
- Never invent medical clearance, injuries, personal records, or equipment.
- Keep the progression appropriate for the event date and available training window.

JSON CONTRACT EXAMPLE
${JSON.stringify(CONTRACT_EXAMPLE, null, 2)}`
}
