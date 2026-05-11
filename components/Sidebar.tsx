"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import LocaleSwitcher from "./LocaleSwitcher";

const NAV_KEYS = [
  { key: "dashboard", href: "/dashboard", icon: "⊞" },
  { key: "trends", href: "/trends", icon: "⌁" },
  { key: "registro", href: "/registro", icon: "✎" },
  { key: "plan", href: "/plan", icon: "☰" },
  { key: "perfil", href: "/perfil", icon: "◉" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

  return (
    <aside className="hidden md:flex w-[200px] flex-shrink-0 h-screen sticky top-0 bg-sidebar border-r border-[#e8e8e8] flex-col">
      <div className="px-5 py-5 border-b border-[#e8e8e8]">
        <span className="text-[22px] font-bold tracking-tight text-accent">movu</span>
        <p className="text-[10px] text-muted mt-0.5">{t("tagline")}</p>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_KEYS.map(({ key, href, icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={key} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active ? "bg-accent-light text-[#222] border border-[#b8efaa]" : "text-muted hover:bg-[#eeeeee] hover:text-[#333]"
              }`}>
              <span className={`text-base ${active ? "text-accent-dark" : ""}`}>{icon}</span>
              {t(`nav.${key}`)}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-5 space-y-3">
        <Link href="/registro"
          className="block w-full bg-accent hover:bg-accent-dark text-white text-sm font-semibold text-center py-2.5 rounded-lg transition-colors">
          {t("cta")}
        </Link>
        <LocaleSwitcher />
      </div>
    </aside>
  );
}
