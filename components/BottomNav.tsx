"use client";

import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  getActiveNavigationIndex,
  LIFEOS_DOCK_GEOMETRY,
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
        className="glass mobile-dock pointer-events-auto relative mx-auto flex max-w-md select-none border border-[var(--border-hi)] p-1.5"
        style={{
          borderRadius: LIFEOS_DOCK_GEOMETRY.radius,
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
          className="mobile-dock-pill absolute"
          style={{
            top: LIFEOS_DOCK_GEOMETRY.pillInset,
            bottom: LIFEOS_DOCK_GEOMETRY.pillInset,
            left: 6,
            width: `calc((100% - 12px) / ${MOVU_NAV_ITEMS.length})`,
            transform: `translateX(${pillPosition * 100}%)`,
            transition: dragging ? "none" : "transform 0.45s cubic-bezier(0.3, 1.35, 0.4, 1)",
            willChange: "transform",
          }}
        >
          <div
            className={`mobile-dock-bubble ${dragging ? "is-dragging" : ""}`}
            style={{
              transform: `scale(${dragging ? LIFEOS_DOCK_GEOMETRY.dragScale : LIFEOS_DOCK_GEOMETRY.restScale})`,
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
              className="relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-transform duration-150 active:scale-90"
              style={{
                minHeight: LIFEOS_DOCK_GEOMETRY.itemMinHeight,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span
                aria-hidden="true"
                className={`data leading-none transition-all duration-300 ${primary ? "text-[19px] font-bold" : "text-[16px]"} ${
                  active ? "-translate-y-px scale-110 text-accent" : "text-[var(--text-faint)]"
                }`}
                style={primary && active ? { textShadow: "0 0 15px rgba(107,224,64,0.62)" } : undefined}
              >
                {item.icon}
              </span>
              <span className={`display whitespace-nowrap text-[10px] font-semibold leading-none transition-colors ${active ? "text-[var(--text)]" : "text-[var(--text-faint)]"}`}>
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
