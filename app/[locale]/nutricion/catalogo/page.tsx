import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import CatalogEditor from '@/components/nutrition/CatalogEditor'

export default async function NutritionCatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('nutrition.catalog')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/nutricion/catalogo`)

  const [foodsResult, groupsResult, groupItemsResult, targetsResult] = await Promise.all([
    supabase.from('food_items').select('*').eq('user_id', user.id).order('name'),
    supabase.from('food_substitution_groups').select('*').eq('user_id', user.id).order('name'),
    supabase.from('food_substitution_group_items').select('*'),
    supabase.from('nutrition_targets').select('*').eq('user_id', user.id),
  ])

  const groupIds = new Set((groupsResult.data ?? []).map((group) => group.id))
  const groupItems = (groupItemsResult.data ?? []).filter((item) => groupIds.has(item.group_id))

  return (
    <div className="boot mx-auto max-w-5xl p-4 md:p-8">
      <MobilePageIntro title={t('title')} eyebrow={t('subtitle')} />
      <div className="mb-6 hidden items-end justify-between gap-3 md:flex">
        <div>
          <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-muted">{t('subtitle')}</p>
        </div>
        <Link href={`/${locale}/nutricion`} className="data text-xs font-semibold text-accent hover:underline">
          ← {t('back')}
        </Link>
      </div>
      <CatalogEditor
        initialFoods={foodsResult.data ?? []}
        initialGroups={groupsResult.data ?? []}
        initialGroupItems={groupItems}
        initialTargets={targetsResult.data ?? []}
      />
    </div>
  )
}
