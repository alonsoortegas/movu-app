"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const NAV_KEYS = [
  { key: "dashboard", href: "/dashboard", icon: "⊞" },
  { key: "registro", href: "/registro", icon: "✎" },
  { key: "plan", href: "/plan", icon: "☰" },
  { key: "perfil", href: "/perfil", icon: "◉" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("bottomNav");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e8e8e8] flex safe-bottom md:hidden">
      {NAV_KEYS.map(({ key, href, icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={key} href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 pt-2.5">
            <span className={`text-xl leading-none ${active ? "text-accent" : "text-[#bbb]"}`}>{icon}</span>
            <span className={`text-[10px] font-medium ${active ? "text-accent" : "text-[#bbb]"}`}>{t(key)}</span>
            {active && <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />}
          </Link>
        );
      })}
    </nav>
  );
}
