import MobilePanel, { type MobileChannel } from './MobilePanel'

export default function MetricTile({
  label,
  value,
  context,
  channel,
}: {
  label: string
  value: string
  context?: string
  channel: Exclude<MobileChannel, 'neutral'>
}) {
  return (
    <MobilePanel channel={channel} className="metric-tile p-4 md:hidden">
      <p className="data text-[11px] uppercase tracking-[0.18em] text-[var(--text-dim)]">{label}</p>
      <p className="data mt-3 text-[2.15rem] font-bold leading-none text-[var(--channel)]">{value}</p>
      {context ? <p className="data mt-3 text-[10px] text-[var(--text-faint)]">{context}</p> : null}
    </MobilePanel>
  )
}
