"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { getActiveNavigationIndex, MOVU_NAV_ITEMS } from "@/lib/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import ThemeToggle from "./ThemeToggle";

export default function MobileHeader() {
  const pathname = usePathname();
  const t = useTranslations("bottomNav");
  const activeItem = MOVU_NAV_ITEMS[getActiveNavigationIndex(pathname)];

  return (
    <header className="glass-thick mobile-chrome fixed inset-x-0 top-0 z-50 safe-top md:hidden">
      <div className="flex h-16 items-center gap-2 px-3">
        <div className="mobile-brand-mark" aria-hidden="true">M</div>
        <span className="display text-lg font-bold text-[var(--text)]">
          mov<span className="text-accent">u</span>
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <LocaleSwitcher compact />
          <ThemeToggle />
          <span className="glass flex min-h-10 items-center rounded-full border border-[var(--border)] px-2.5">
            <span className="pulse-dot mr-2 h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="display max-w-[64px] truncate text-[10px] font-semibold text-[var(--text-dim)]">
              {t(activeItem.key)}
            </span>
          </span>
        </div>
      </div>
      <div className="glint-track absolute inset-x-0 bottom-0 h-px bg-[var(--ink-06)]" aria-hidden="true" />
    </header>
  );
}
