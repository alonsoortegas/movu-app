'use client'

/* OAuth must use a full document navigation so the external provider redirect is followed. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function WhoopStatus({
  connected,
  reauthRequired,
}: {
  connected: boolean
  reauthRequired: boolean
}) {
  const t = useTranslations('trends.whoop')
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'synced' | 'error'>('idle')

  async function sync() {
    setSyncing(true)
    setStatus('idle')
    const res = await fetch('/api/whoop/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 30 }),
    })
    setSyncing(false)
    setStatus(res.ok ? 'synced' : 'error')
  }

  return (
    <div className="panel mobile-sheet rounded-[1.6rem] p-4 md:rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="data text-[10px] font-bold uppercase tracking-[0.16em] text-muted">WHOOP</div>
          <div className="mt-1 text-sm font-semibold text-[var(--text)]">
            {reauthRequired ? t('reauthRequired') : connected ? t('connected') : t('notConnected')}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-dim)]">
            {reauthRequired ? t('reauthBody') : connected ? t('connectedBody') : t('connectBody')}
          </p>
          {status === 'synced' && <p className="mt-1 text-[11px] font-semibold text-accent">{t('synced')}</p>}
          {status === 'error' && <p className="mt-1 text-[11px] font-semibold text-[var(--coral)]">{t('syncFailed')}</p>}
        </div>
        {connected && !reauthRequired ? (
          <button onClick={sync} disabled={syncing} className="glass flex-shrink-0 rounded-xl border border-accent px-3 py-2 text-xs font-bold text-accent disabled:opacity-60">
            {syncing ? t('syncing') : t('syncCta')}
          </button>
        ) : (
          <a href="/api/whoop/connect" className="btn-accent flex-shrink-0 rounded-xl px-3 py-2 text-xs font-bold">
            {reauthRequired ? t('reconnectCta') : t('connectCta')}
          </a>
        )}
      </div>
    </div>
  )
}
