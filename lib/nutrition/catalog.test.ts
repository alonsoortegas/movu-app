import { describe, expect, it } from 'vitest'
import { buildTargetRows, type TargetDrafts } from './catalog'

const drafts: TargetDrafts = {
  hard: { calories: '2600', protein: '180', carbs: '320', fat: '70' },
  moderate: { calories: '2300', protein: '175', carbs: '250', fat: '75' },
  rest: { calories: '2050', protein: '175', carbs: '180', fat: '80' },
}

describe('buildTargetRows', () => {
  it('serializes all three day types with integer targets', () => {
    expect(buildTargetRows(drafts, false)).toEqual([
      { day_type: 'hard', calories_target: 2600, protein_target: 180, carbs_target: 320, fat_target: 70 },
      { day_type: 'moderate', calories_target: 2300, protein_target: 175, carbs_target: 250, fat_target: 75 },
      { day_type: 'rest', calories_target: 2050, protein_target: 175, carbs_target: 180, fat_target: 80 },
    ])
  })

  it('uses moderate-day values for every row when same-every-day is enabled', () => {
    expect(buildTargetRows(drafts, true)).toEqual([
      { day_type: 'hard', calories_target: 2300, protein_target: 175, carbs_target: 250, fat_target: 75 },
      { day_type: 'moderate', calories_target: 2300, protein_target: 175, carbs_target: 250, fat_target: 75 },
      { day_type: 'rest', calories_target: 2300, protein_target: 175, carbs_target: 250, fat_target: 75 },
    ])
  })

  it('accepts comma decimals and rounds to the database integer shape', () => {
    const decimalDrafts: TargetDrafts = {
      ...drafts,
      moderate: { calories: '2299,6', protein: '174,5', carbs: '249,5', fat: '74,5' },
    }
    expect(buildTargetRows(decimalDrafts, true)?.[0]).toEqual({
      day_type: 'hard',
      calories_target: 2300,
      protein_target: 175,
      carbs_target: 250,
      fat_target: 75,
    })
  })

  it('rejects blank, non-numeric, or negative targets', () => {
    expect(buildTargetRows({ ...drafts, hard: { ...drafts.hard, calories: '' } }, false)).toBeNull()
    expect(buildTargetRows({ ...drafts, rest: { ...drafts.rest, protein: 'nope' } }, false)).toBeNull()
    expect(buildTargetRows({ ...drafts, moderate: { ...drafts.moderate, fat: '-1' } }, true)).toBeNull()
  })
})
