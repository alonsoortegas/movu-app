import type { HTMLAttributes } from 'react'

export type MobileChannel = 'lime' | 'cyan' | 'violet' | 'coral' | 'amber' | 'neutral'

export default function MobilePanel({
  channel = 'neutral',
  className = '',
  ...props
}: HTMLAttributes<HTMLElement> & { channel?: MobileChannel }) {
  return <section data-channel={channel} className={`mobile-panel ${className}`} {...props} />
}
