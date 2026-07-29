import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import NutritionToday from '@/components/nutrition/NutritionToday'
import { dateKey } from '@/lib/trends/compute'
import type { MacroTotals, NutritionDayType } from '@/lib/nutrition/macros'
import type { Database } from '@/types/database'
import NutritionPlanCard from '@/components/nutrition/NutritionPlanCard'
import { parseNutritionTrackingMode } from '@/lib/nutrition/tracking-mode'

type MealLogItem = Database['public']['Tables']['meal_log_items']['Row']

export default async function NutritionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('nutrition')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/nutricion`)

  const today = dateKey(new Date().toISOString())

  const [profileResult, plansResult, dayResult, targetsResult, logsResult, foodsResult, groupsResult, groupItemsResult, portionsResult] =
    await Promise.all([
      supabase.from('user_profiles').select('nutrition_tracking_mode').eq('id', user!.id).single(),
      supabase.from('nutrition_plans').select('*').eq('user_id', user!.id).order('starts_on', { ascending: false }),
      supabase.from('nutrition_days').select('*').eq('user_id', user!.id).eq('date', today).maybeSingle(),
      supabase.from('nutrition_targets').select('*').eq('user_id', user!.id),
      supabase.from('meal_logs').select('*').eq('user_id', user!.id).eq('date', today).order('logged_at'),
      supabase.from('food_items').select('*').eq('user_id', user!.id).order('name'),
      supabase.from('food_substitution_groups').select('*').eq('user_id', user!.id).order('name'),
      supabase.from('food_substitution_group_items').select('*'),
      supabase.from('saved_food_portions').select('*').eq('user_id', user!.id).order('name'),
    ])

  const mealLogs = logsResult.data ?? []
  let items: MealLogItem[] = []
  if (mealLogs.length) {
    const { data: itemRows } = await supabase
      .from('meal_log_items')
      .select('*')
      .in('meal_log_id', mealLogs.map((m) => m.id))
      .order('created_at')
    items = itemRows ?? []
  }

  const groupIds = new Set((groupsResult.data ?? []).map((g) => g.id))
  const groupItems = (groupItemsResult.data ?? []).filter((item) => groupIds.has(item.group_id))
  const mode = parseNutritionTrackingMode(profileResult.data?.nutrition_tracking_mode ?? 'macro_targets')
  const activePlan = (plansResult.data ?? []).find((plan) => plan.active)
  const planTargets: MacroTotals | null = activePlan?.calories_target != null &&
      activePlan.protein_target_g != null &&
      activePlan.carbs_target_g != null &&
      activePlan.fat_target_g != null
    ? {
        calories: activePlan.calories_target,
        protein_g: activePlan.protein_target_g,
        carbs_g: activePlan.carbs_target_g,
        fat_g: activePlan.fat_target_g,
      }
    : null

  const planCard = <NutritionPlanCard initialPlans={plansResult.data ?? []} />
  const nutritionToday = (
    <NutritionToday
      date={today}
      initialDayType={(dayResult.data?.day_type as NutritionDayType | undefined) ?? null}
      targets={targetsResult.data ?? []}
      initialMealLogs={mealLogs}
      initialItems={items}
      foods={foodsResult.data ?? []}
      groups={groupsResult.data ?? []}
      groupItems={groupItems}
      initialPortions={portionsResult.data ?? []}
      trackingMode={mode}
      planTargets={planTargets}
      planSourceLabel={mode === 'plan_document' ? activePlan?.provider_name ?? null : null}
    />
  )

  return (
    <div className="boot mx-auto max-w-4xl p-4 md:p-8">
      <MobilePageIntro title={t('title')} eyebrow={t('subtitle')} />
      <div className="mb-6 hidden md:block">
        <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-muted">{t('subtitle')}</p>
      </div>
      {mode === 'plan_document' ? (
        <>
          <div className="mb-4">{planCard}</div>
          <details>
            <summary className="mb-4 cursor-pointer text-sm font-semibold text-[var(--text-dim)]">{t('detailedOptional')}</summary>
            {nutritionToday}
          </details>
        </>
      ) : (
        <>
          {nutritionToday}
          <details className="mt-4">
            <summary className="mb-4 cursor-pointer text-sm font-semibold text-[var(--text-dim)]">{t('planDocumentsOptional')}</summary>
            {planCard}
          </details>
        </>
      )}
    </div>
  )
}
