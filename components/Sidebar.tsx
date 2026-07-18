"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { getActiveNavigationIndex, MOVU_NAV_ITEMS } from "@/lib/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import ThemeToggle from "./ThemeToggle";

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const activeIndex = getActiveNavigationIndex(pathname);

  return (
    <aside className="glass-thick sticky top-0 hidden h-screen w-[220px] flex-shrink-0 flex-col border-r border-[var(--border)] md:flex">
      <div className="border-b border-[var(--ink-06)] px-5 py-5">
        <span className="display text-[24px] font-bold tracking-[-0.05em] text-[var(--text)]">
          mov<span className="text-accent">u</span>
        </span>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.13em] text-[var(--text-faint)]">
          {t("tagline")}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-3 py-4" aria-label="Primary navigation">
        {MOVU_NAV_ITEMS.map((item, index) => {
          const active = index === activeIndex;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-11 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${
                active
                  ? "border-[rgba(107,224,64,0.38)] bg-[var(--accent-soft)] text-[var(--text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_22px_rgba(107,224,64,0.10)]"
                  : "border-transparent text-[var(--text-dim)] hover:border-[var(--border)] hover:bg-[var(--ink-04)] hover:text-[var(--text)]"
              }`}
            >
              {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent shadow-[0_0_10px_rgba(107,224,64,0.7)]" />}
              <span className={`data w-5 text-center text-base ${active ? "text-accent" : "text-[var(--text-faint)] group-hover:text-[var(--text-dim)]"}`} aria-hidden="true">
                {item.icon}
              </span>
              <span>{t(`nav.${item.key}`)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-[var(--ink-06)] px-3 py-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </aside>
  );
}
