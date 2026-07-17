"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  getActiveNavigationIndex,
  MOVU_NAV_ITEMS,
  nearestNavigationIndex,
  positionFromPointer,
} from "@/lib/navigation";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("bottomNav");
  const barRef = useRef<HTMLDivElement>(null);
  const dragPositionRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const [dragPosition, setDragPositionState] = useState<number | null>(null);
  const activeIndex = getActiveNavigationIndex(pathname);
  const dragging = dragPosition !== null;

  const setDragPosition = (position: number | null) => {
    dragPositionRef.current = position;
    setDragPositionState(position);
  };

  const pointerPosition = (clientX: number) => {
    const bar = barRef.current;
    if (!bar) return null;
    const rect = bar.getBoundingClientRect();
    return positionFromPointer(clientX, rect.left, rect.width, MOVU_NAV_ITEMS.length);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    movedRef.current = false;
    const position = pointerPosition(event.clientX);
    if (position !== null) setDragPosition(position);
  };

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const preventPageScroll = (event: TouchEvent) => event.preventDefault();
    bar.addEventListener("touchmove", preventPageScroll, { passive: false });
    return () => bar.removeEventListener("touchmove", preventPageScroll);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      const position = pointerPosition(event.clientX);
      if (position === null) return;
      if (Math.abs(position - (dragPositionRef.current ?? position)) > 0.03) {
        movedRef.current = true;
      }
      setDragPosition(position);
    };

    const settle = (event: PointerEvent) => {
      const finalPosition = pointerPosition(event.clientX) ?? dragPositionRef.current;
      setDragPosition(null);
      if (finalPosition === null) return;
      const item = MOVU_NAV_ITEMS[nearestNavigationIndex(finalPosition, MOVU_NAV_ITEMS.length)];
      router.push(item.href);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", settle);
    window.addEventListener("pointercancel", settle);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", settle);
      window.removeEventListener("pointercancel", settle);
    };
  }, [dragging, router]);

  const pillPosition = dragPosition ?? activeIndex;
  const focusedIndex = dragging ? nearestNavigationIndex(dragPosition, MOVU_NAV_ITEMS.length) : activeIndex;

  return (
    <nav
      aria-label="Primary navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
    >
      <div
        ref={barRef}
        className="glass pointer-events-auto relative mx-auto flex max-w-md select-none rounded-[28px] border border-[var(--border-hi)] p-1.5"
        style={{
          boxShadow: "var(--glass-edge), var(--shadow-pop)",
          touchAction: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          WebkitTapHighlightColor: "transparent",
        }}
        onPointerDown={handlePointerDown}
      >
        <div
          aria-hidden="true"
          className="absolute bottom-1.5 top-1.5"
          style={{
            left: 6,
            width: `calc((100% - 12px) / ${MOVU_NAV_ITEMS.length})`,
            transform: `translateX(${pillPosition * 100}%)`,
            transition: dragging ? "none" : "transform 0.45s cubic-bezier(0.3, 1.35, 0.4, 1)",
            willChange: "transform",
          }}
        >
          <div
            className="h-full w-full rounded-full"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.02) 48%), linear-gradient(180deg, rgba(107,224,64,0.34), rgba(107,224,64,0.13))",
              border: "1px solid rgba(107,224,64,0.46)",
              boxShadow: dragging
                ? "inset 0 1px 0 rgba(255,255,255,0.34), 0 7px 20px rgba(0,0,0,0.3), 0 0 28px rgba(107,224,64,0.38)"
                : "inset 0 1px 0 rgba(255,255,255,0.24), 0 4px 13px rgba(0,0,0,0.22), 0 0 20px rgba(107,224,64,0.25)",
              transform: dragging ? "scale(1.06)" : "scale(1)",
              transition: "transform 0.2s cubic-bezier(0.3, 1.35, 0.4, 1), box-shadow 0.2s ease",
            }}
          />
        </div>

        {MOVU_NAV_ITEMS.map((item, index) => {
          const active = focusedIndex === index;
          const current = activeIndex === index;
          const primary = item.key === "registro";

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={(event) => {
                if (movedRef.current) event.preventDefault();
              }}
              className="relative z-10 flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-transform duration-150 active:scale-90"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <span
                aria-hidden="true"
                className={`data leading-none transition-all duration-300 ${primary ? "text-[18px] font-bold" : "text-[15px]"} ${
                  active ? "-translate-y-px scale-110 text-accent" : "text-[var(--text-faint)]"
                }`}
                style={primary && active ? { textShadow: "0 0 15px rgba(107,224,64,0.62)" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`display whitespace-nowrap text-[9px] font-semibold leading-none transition-colors ${active ? "text-[var(--text)]" : "text-[var(--text-faint)]"}`}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
