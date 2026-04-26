"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞" },
  { href: "/registro", label: "Registro", icon: "✎" },
  { href: "/plan", label: "Mi Plan", icon: "☰" },
  { href: "/perfil", label: "Perfil", icon: "◉" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[200px] flex-shrink-0 h-screen sticky top-0 bg-sidebar border-r border-[#e8e8e8] flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#e8e8e8]">
        <span className="text-[22px] font-bold tracking-tight text-accent">
          movu
        </span>
        <p className="text-[10px] text-muted mt-0.5">Entrena más inteligente.</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || (href === "/dashboard" && pathname === "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-accent-light text-[#222] border border-[#b8efaa]"
                  : "text-muted hover:bg-[#eeeeee] hover:text-[#333]"
              }`}
            >
              <span className={`text-base ${active ? "text-accent-dark" : ""}`}>
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* CTA */}
      <div className="px-3 pb-5">
        <Link
          href="/registro"
          className="block w-full bg-accent hover:bg-accent-dark text-white text-sm font-semibold text-center py-2.5 rounded-lg transition-colors"
        >
          + Registrar hoy
        </Link>
      </div>
    </aside>
  );
}
