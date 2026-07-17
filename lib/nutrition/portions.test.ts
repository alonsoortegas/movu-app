import { describe, expect, it } from 'vitest'
import {
  buildPortionOptions,
  mergeSavedFoodPortion,
  normalizeSavedPortionName,
  scalePortionOption,
  type PortionOption,
} from './portions'

const foods = [
  {
    id: 'f1',
    name: 'Egg',
    portion_label: '1 egg',
    calories: 70,
    protein_g: 6,
    carbs_g: 0.5,
    fat_g: 5,
  },
]

const saved = [
  { id: 's1', name: 'My overnight oats', calories: 420, protein_g: 22, carbs_g: 60, fat_g: 9 },
]

describe('normalizeSavedPortionName', () => {
  it('trims, collapses whitespace, lowercases', () => {
    expect(normalizeSavedPortionName('  My  Overnight   Oats ')).toBe('my overnight oats')
  })
})

describe('buildPortionOptions', () => {
  it('lists catalog foods then saved portions with stable keys', () => {
    const options = buildPortionOptions(foods, saved)
    expect(options.map((o) => o.key)).toEqual(['catalog:f1', 'saved:s1'])
    expect(options[0]).toMatchObject({ source: 'catalog', portionLabel: '1 egg' })
    expect(options[1]).toMatchObject({ source: 'saved', portionLabel: '1 saved portion' })
  })
})

describe('scalePortionOption', () => {
  it('rounds like scaleFood', () => {
    const option: PortionOption = {
      key: 'catalog:f1',
      source: 'catalog',
      sourceId: 'f1',
      name: 'Egg',
      portionLabel: '1 egg',
      calories: 70,
      protein_g: 6,
      carbs_g: 0.5,
      fat_g: 5,
    }
    expect(scalePortionOption(option, 4)).toEqual({
      quantity: 4,
      calories: 280,
      protein_g: 24,
      carbs_g: 2,
      fat_g: 20,
    })
  })
})

describe('mergeSavedFoodPortion', () => {
  it('replaces by id and keeps the list name-sorted', () => {
    const merged = mergeSavedFoodPortion(
      [
        { id: 'a', name: 'Zucchini bowl' },
        { id: 'b', name: 'Avocado toast' },
      ],
      { id: 'a', name: 'Arroz con pollo' },
    )
    expect(merged.map((p) => p.name)).toEqual(['Arroz con pollo', 'Avocado toast'])
  })
})
