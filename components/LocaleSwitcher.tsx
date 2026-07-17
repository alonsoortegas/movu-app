"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = { es: "ES", en: "EN", de: "DE" };

export default function LocaleSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitch = (next: string) => {
    router.replace(pathname, { locale: next });
  };

  return (
    <div className={`flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--ink-04)] ${compact ? "p-0.5" : "p-1"}`}>
      {routing.locales
        .filter((l) => l !== "de")
        .map((l) => (
          <button
            key={l}
            onClick={() => handleSwitch(l)}
            aria-label={`${l === "es" ? "Español" : "English"}`}
            className={`${compact ? "min-w-8 px-1.5 py-1.5 text-[10px]" : "px-2.5 py-1 text-xs"} rounded-full font-semibold transition-all ${
              locale === l
                ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
                : "text-[var(--text-faint)] hover:bg-[var(--ink-04)] hover:text-[var(--text)]"
            }`}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
    </div>
  );
}
