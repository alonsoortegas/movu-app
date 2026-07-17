import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import MobilePageIntro from '@/components/mobile/MobilePageIntro'
import PlanEditor from '@/components/plan/PlanEditor'

export default async function PlanEditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('planEditor')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/${locale}/plan/edit`)

  const { data: plans } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="boot mx-auto max-w-4xl p-4 md:p-8">
      <MobilePageIntro title={t('title')} eyebrow={t('subtitle')} />
      <div className="mb-6 hidden md:block">
        <h1 className="display text-2xl font-bold text-[var(--text)]">{t('title')}</h1>
        <p className="mt-0.5 text-sm text-muted">{t('subtitle')}</p>
      </div>
      <PlanEditor initialPlans={plans ?? []} />
    </div>
  )
}
