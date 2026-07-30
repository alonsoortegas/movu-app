import { describe, expect, it } from 'vitest'
import { parseImportedPlanJson, toImportRpcPayload } from './plan-import'

const validPlan = {
  schema_version: '1.0',
  name: 'HYROX Acapulco',
  start_date: '2026-08-01',
  weeks: [
    {
      week_number: 1,
      sessions: [
        {
          day_of_week: 'monday',
          title: 'Stations',
          session_type: 'strength',
          notes: null,
          exercises: [
            {
              name: ' Wall balls ',
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

function issueFor(plan: unknown) {
  const result = parseImportedPlanJson(JSON.stringify(plan))
  expect(result.ok).toBe(false)
  return result.ok ? null : result.issues[0]
}

describe('parseImportedPlanJson', () => {
  it('normalizes a complete version 1.0 plan', () => {
    const result = parseImportedPlanJson(JSON.stringify(validPlan))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.plan.name).toBe('HYROX Acapulco')
      expect(result.plan.weeks[0].sessions[0].exercises[0].name).toBe('Wall balls')
    }
  })

  it('accepts null optional prescription fields', () => {
    const input = structuredClone(validPlan)
    Object.assign(input.weeks[0].sessions[0].exercises[0], {
      sets: null,
      reps: null,
      suggested_weight_kg: null,
      target_rpe: null,
      rest_seconds: null,
      superset_group: null,
      notes: null,
    })
    expect(parseImportedPlanJson(JSON.stringify(input)).ok).toBe(true)
  })

  it('normalizes common alphabetic superset labels', () => {
    const input = structuredClone(validPlan)
    input.weeks[0].sessions[0].exercises.push(
      {
        ...structuredClone(input.weeks[0].sessions[0].exercises[0]),
        name: 'Exercise A1',
        superset_group: 'A' as unknown as null,
      },
      {
        ...structuredClone(input.weeks[0].sessions[0].exercises[0]),
        name: 'Exercise B1',
        superset_group: 'B' as unknown as null,
      },
    )

    const result = parseImportedPlanJson(JSON.stringify(input))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.plan.weeks[0].sessions[0].exercises[1].superset_group).toBe(1)
      expect(result.plan.weeks[0].sessions[0].exercises[2].superset_group).toBe(2)
    }
  })

  it('rejects malformed and oversized JSON', () => {
    expect(parseImportedPlanJson('{').ok).toBe(false)
    const result = parseImportedPlanJson(' '.repeat(500 * 1024 + 1))
    expect(result).toEqual({ ok: false, issues: [{ path: '$', code: 'too_large' }] })
  })

  it('rejects unknown versions and unknown fields', () => {
    expect(issueFor({ ...validPlan, schema_version: '2.0' })).toEqual({
      path: 'schema_version',
      code: 'unsupported_version',
    })
    expect(issueFor({ ...validPlan, athlete_id: 'unsafe' })).toEqual({
      path: 'athlete_id',
      code: 'unknown_field',
    })
  })

  it('rejects invalid dates and nonconsecutive weeks', () => {
    expect(issueFor({ ...validPlan, start_date: '2026-02-30' })).toEqual({
      path: 'start_date',
      code: 'invalid_date',
    })
    const input = structuredClone(validPlan)
    input.weeks.push({ ...structuredClone(input.weeks[0]), week_number: 3 })
    expect(issueFor(input)).toEqual({ path: 'weeks[1].week_number', code: 'nonconsecutive_week' })
  })

  it('rejects invalid enums, negative prescriptions, and RPE outside 1–10', () => {
    const invalidDay = structuredClone(validPlan)
    invalidDay.weeks[0].sessions[0].day_of_week = 'funday'
    expect(issueFor(invalidDay)).toEqual({
      path: 'weeks[0].sessions[0].day_of_week',
      code: 'invalid_day',
    })

    const negativeSets = structuredClone(validPlan)
    negativeSets.weeks[0].sessions[0].exercises[0].sets = -1
    expect(issueFor(negativeSets)).toEqual({
      path: 'weeks[0].sessions[0].exercises[0].sets',
      code: 'nonnegative_integer',
    })

    const badRpe = structuredClone(validPlan)
    badRpe.weeks[0].sessions[0].exercises[0].target_rpe = '11'
    expect(issueFor(badRpe)).toEqual({
      path: 'weeks[0].sessions[0].exercises[0].target_rpe',
      code: 'invalid_rpe',
    })
  })

  it('produces a JSON-safe RPC payload without losing suggested weight', () => {
    const result = parseImportedPlanJson(JSON.stringify(validPlan))
    if (!result.ok) throw new Error('fixture must be valid')
    const payload = toImportRpcPayload(result.plan)
    expect(payload).toEqual(JSON.parse(JSON.stringify(result.plan)))
    expect(JSON.stringify(payload)).toContain('"suggested_weight_kg":6')
  })
})
