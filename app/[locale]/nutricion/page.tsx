import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import NutritionToday from '@/components/nutrition/NutritionToday'
import { dateKey } from '@/lib/trends/compute'
import type { NutritionDayType } from '@/lib/nutrition/macros'
import type { Database } from '@/types/database'

type MealLogItem = Database['public']['Tables']['meal_log_items']['Row']

export default async function NutritionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('nutrition')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/nutricion`)

  const today = dateKey(new Date().toISOString())

  const [dayResult, targetsResult, logsResult, foodsResult, groupsResult, groupItemsResult, portionsResult] =
    await Promise.all([
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

  return (
    <div className="boot mx-auto max-w-4xl p-4 md:p-8">
      <MobilePageIntro title={t('title')} eyebrow={t('subtitle')} />
      <div className="mb-6 hidden md:block">
        <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-muted">{t('subtitle')}</p>
      </div>
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
      />
    </div>
  )
}
