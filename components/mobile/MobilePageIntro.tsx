import type { ReactNode } from 'react'

export default function MobilePageIntro({
  title,
  eyebrow,
  aside,
}: {
  title: string
  eyebrow: string
  aside?: ReactNode
}) {
  return (
    <header className="mobile-page-intro mb-7 flex items-start justify-between gap-4 md:hidden">
      <div className="min-w-0">
        <h1 className="display text-[clamp(2.25rem,11vw,3.35rem)] font-bold leading-[0.95] text-[var(--text)]">
          {title}
        </h1>
        <p className="data mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-faint)]">
          {eyebrow}
        </p>
      </div>
      {aside}
    </header>
  )
}
