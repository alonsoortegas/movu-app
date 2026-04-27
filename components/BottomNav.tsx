"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/registro", label: "Registrar", icon: "✎" },
  { href: "/plan", label: "Mi Plan", icon: "☰" },
  { href: "/perfil", label: "Perfil", icon: "◉" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e8e8e8] flex safe-bottom md:hidden">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = pathname === href || (href === "/dashboard" && pathname === "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 pt-2.5"
          >
            <span className={`text-xl leading-none ${active ? "text-accent" : "text-[#bbb]"}`}>
              {icon}
            </span>
            <span className={`text-[10px] font-medium ${active ? "text-accent" : "text-[#bbb]"}`}>
              {label}
            </span>
            {active && (
              <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
