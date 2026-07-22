'use client'

import { useState } from 'react'

export default function NutritionPlanViewer({ planId, label }: { planId: string; label: string }) {
  const [busy, setBusy] = useState(false)
  async function open() {
    setBusy(true)
    const response = await fetch(`/api/nutrition/plans/${planId}`)
    const data = await response.json().catch(() => ({}))
    setBusy(false)
    if (response.ok && data.signedUrl) window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  return <button type="button" onClick={open} disabled={busy} className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{busy ? '…' : label}</button>
}
