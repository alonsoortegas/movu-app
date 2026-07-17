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
    <header className="glass-thick fixed inset-x-0 top-0 z-50 md:hidden safe-top">
      <div className="flex h-[72px] items-center gap-3 px-4">
        <div className="min-w-0">
          <div className="display text-[20px] font-bold leading-none tracking-[-0.04em] text-[var(--text)]">
            mov<span className="text-accent">u</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {t(activeItem.key)}
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher compact />
          <ThemeToggle />
        </div>
      </div>
      <div className="glint-track h-px bg-[var(--ink-06)]" aria-hidden="true" />
    </header>
  );
}
