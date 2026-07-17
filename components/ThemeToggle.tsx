"use client";

import { useEffect, useState } from "react";
import { MOVU_THEME_STORAGE_KEY } from "@/lib/theme";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggleTheme = () => {
    const nextLight = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", nextLight);
    localStorage.setItem(MOVU_THEME_STORAGE_KEY, nextLight ? "light" : "dark");
    setLight(nextLight);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={light ? "Use dark theme" : "Use light theme"}
      title={light ? "Use dark theme" : "Use light theme"}
      className="glass inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[15px] text-[var(--text-dim)] transition-all hover:border-[var(--border-hi)] hover:text-[var(--text)] active:scale-90"
    >
      <span aria-hidden="true">{light ? "◐" : "◑"}</span>
    </button>
  );
}
