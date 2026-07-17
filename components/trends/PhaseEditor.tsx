'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { PhaseKind } from '@/lib/trends/compute'

interface PhaseRow {
  id: string
  kind: PhaseKind
  start_date: string
  end_date: string | null
  target_rate_kg_per_week: number | null
}

const KINDS: PhaseKind[] = ['bulk', 'cut', 'maintenance']

export default function PhaseEditor({ phases }: { phases: PhaseRow[] }) {
  const t = useTranslations('trends.phases')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<PhaseKind>('bulk')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [targetRate, setTargetRate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = phases.find((p) => p.end_date == null)

  async function startPhase() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        start_date: startDate,
        target_rate_kg_per_week: targetRate.trim() ? Number(targetRate.replace(',', '.')) : null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(t('saveError'))
      return
    }
    setOpen(false)
    router.refresh()
  }

  async function endPhase(id: string) {
    setBusy(true)
    const res = await fetch(`/api/phases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end_date: new Date().toISOString().slice(0, 10) }),
    })
    setBusy(false)
    if (res.ok) router.refresh()
  }

  return (
    <div className="mt-3 border-t border-dashed border-[var(--border)] pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="data text-[10px] uppercase tracking-[0.16em] text-muted">
          {current
            ? t('current', { kind: t(`kind.${current.kind}`), since: current.start_date })
            : t('none')}
        </span>
        <div className="flex gap-2">
          {current && (
            <button
              onClick={() => endPhase(current.id)}
              disabled={busy}
              className="glass rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-dim)]"
            >
              {t('end')}
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="glass rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-accent"
          >
            {open ? t('cancel') : t('start')}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  kind === k
                    ? 'border-accent bg-accent-light text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text-dim)]'
                }`}
              >
                {t(`kind.${k}`)}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass flex-1 rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--text)]"
            />
            <input
              type="text"
              inputMode="decimal"
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
              placeholder={t('ratePlaceholder')}
              className="glass w-28 rounded-lg border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-xs text-[var(--text)]"
            />
          </div>
          {error && <p className="text-[11px] text-[var(--coral)]">{error}</p>}
          <button
            onClick={startPhase}
            disabled={busy}
            className="btn-accent w-full rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60"
          >
            {t('confirm')}
          </button>
        </div>
      )}
    </div>
  )
}
