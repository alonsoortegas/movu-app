"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = { es: "ES", en: "EN", de: "DE" };

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleSwitch = (next: string) => {
    router.replace(pathname, { locale: next });
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-[#f0f0f0] rounded-lg">
      {routing.locales
        .filter((l) => l !== "de")
        .map((l) => (
          <button
            key={l}
            onClick={() => handleSwitch(l)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
              locale === l ? "bg-white text-[#111] shadow-sm" : "text-[#888] hover:text-[#333]"
            }`}
          >
            {LOCALE_LABELS[l]}
          </button>
        ))}
    </div>
  );
}
