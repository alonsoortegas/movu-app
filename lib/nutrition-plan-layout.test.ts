import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import es from '@/messages/es.json'
import en from '@/messages/en.json'
import de from '@/messages/de.json'

const cardSource = readFileSync(
  resolve(process.cwd(), 'components/nutrition/NutritionPlanCard.tsx'),
  'utf8',
)
const createRoute = readFileSync(
  resolve(process.cwd(), 'app/api/nutrition/plans/route.ts'),
  'utf8',
)
const itemRoute = readFileSync(
  resolve(process.cwd(), 'app/api/nutrition/plans/[id]/route.ts'),
  'utf8',
)
const catalogSource = readFileSync(
  resolve(process.cwd(), 'components/nutrition/CatalogEditor.tsx'),
  'utf8',
)
const fuelSource = readFileSync(
  resolve(process.cwd(), 'components/dashboard/FuelTodayCard.tsx'),
  'utf8',
)

describe('manual nutrition plan workflow', () => {
  it('validates manual targets on upload and edit', () => {
    expect(createRoute).toContain('parsePlanTargets')
    expect(createRoute).toContain('planTargetInsert')
    expect(itemRoute).toContain('export async function PATCH')
    expect(itemRoute).toContain('parsePlanTargets')
  })

  it('states that PDFs are reference-only and exposes manual macro editing', () => {
    expect(cardSource).toContain("t('referenceOnly')")
    expect(cardSource).toContain('name="protein_target_g"')
    expect(cardSource).toContain('name="carbs_target_g"')
    expect(cardSource).toContain('name="fat_target_g"')
    expect(cardSource).toContain("method: 'PATCH'")
    expect(es.nutrition.planDocument.referenceOnly).toContain('No analiza')
  })

  it('explains daily objectives, fuel, and frequent foods in every locale', () => {
    expect(catalogSource).toContain("t('targets.dailyObjectivesHelp')")
    expect(catalogSource).toContain("t('foods.frequentFoodsHelp')")
    expect(catalogSource).toContain("t('foods.saveFrequentFood')")
    expect(fuelSource).toContain("t('todayFuelHelp')")
    for (const catalog of [es, en, de]) {
      expect(catalog.nutrition.catalog.targets.dailyObjectivesHelp).toBeTruthy()
      expect(catalog.nutrition.catalog.foods.frequentFoodsHelp).toBeTruthy()
      expect(catalog.nutrition.catalog.foods.saveFrequentFood).toBeTruthy()
      expect(catalog.dashboard.fuel.todayFuelHelp).toBeTruthy()
    }
  })

  it('renders the food editor before a populated catalog can push it off screen', () => {
    const editorPosition = catalogSource.indexOf('{foodOpen &&')
    const catalogPosition = catalogSource.indexOf('{foods.length === 0')
    expect(editorPosition).toBeGreaterThan(-1)
    expect(editorPosition).toBeLessThan(catalogPosition)
  })
})
