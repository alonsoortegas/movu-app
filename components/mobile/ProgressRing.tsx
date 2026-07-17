import { clampPercent } from '@/lib/mobile-dashboard'
import type { MobileChannel } from './MobilePanel'

export default function ProgressRing({
  label,
  value,
  displayValue,
  channel,
}: {
  label: string
  value: number | null
  displayValue?: string
  channel: Exclude<MobileChannel, 'neutral' | 'coral'>
}) {
  const bounded = value === null ? 0 : clampPercent(value)
  const aria = value === null ? `${label}: unavailable` : `${label}: ${Math.round(bounded)} percent`

  return (
    <figure className="progress-ring-wrap" role="img" aria-label={aria} data-channel={channel}>
      <div className="progress-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="progress-ring-track" cx="60" cy="60" r="52" pathLength="100" />
          <circle
            className="progress-ring-value"
            cx="60"
            cy="60"
            r="52"
            pathLength="100"
            strokeDasharray={`${bounded} 100`}
          />
        </svg>
        <span className="data progress-ring-number">
          {value === null ? '—' : (displayValue ?? `${Math.round(bounded)}%`)}
        </span>
      </div>
      <figcaption className="data text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-faint)]">
        {label}
      </figcaption>
    </figure>
  )
}
