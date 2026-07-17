"use client";

import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslations } from "next-intl";
import {
  HEALTHKIT_SYNC_PROGRESS_EVENT,
  runHealthKitSync,
  type HealthKitSyncProgress,
} from "@/lib/healthkit/sync";

export default function HealthKitSyncManager() {
  const t = useTranslations("perfil.healthkit");
  const [isNativeIos, setIsNativeIos] = useState(false);
  const [progress, setProgress] = useState<HealthKitSyncProgress | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;
    const nativeIos = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
    setIsNativeIos(nativeIos);

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<HealthKitSyncProgress>).detail;
      if (!detail) return;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setProgress(detail);
      if (detail.stage === "complete" || detail.stage === "error") {
        hideTimer.current = setTimeout(() => setProgress(null), detail.stage === "complete" ? 900 : 3500);
      }
    };

    window.addEventListener(HEALTHKIT_SYNC_PROGRESS_EVENT, handleProgress);

    runHealthKitSync().catch((err) => {
      console.warn("[healthkit] initial sync failed", err);
    });

    import("@capacitor/app")
      .then(({ App }) => App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          runHealthKitSync().catch((err) => {
            console.warn("[healthkit] foreground sync failed", err);
          });
        }
      }))
      .then((handle) => {
        if (disposed) {
          handle.remove();
        } else {
          removeListener = () => handle.remove();
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      removeListener?.();
      window.removeEventListener(HEALTHKIT_SYNC_PROGRESS_EVENT, handleProgress);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  if (!isNativeIos || !progress) return null;

  const isDone = progress.stage === "complete";
  const isError = progress.stage === "error";
  const progressLabel = t(`stages.${progress.stage}`);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 backdrop-blur-[2px] md:items-center md:pb-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("title")}</p>
            <h2 className="mt-1 text-lg font-bold text-[#111]">
              {isDone ? t("completeTitle") : isError ? t("errorTitle") : t("syncTitle")}
            </h2>
          </div>
          <div className={`h-9 w-9 rounded-full border flex items-center justify-center text-sm font-bold ${isError ? "border-red-200 bg-red-50 text-red-600" : "border-accent bg-accent-light text-accent-dark"}`}>
            {isDone ? "✓" : isError ? "!" : `${Math.round(progress.progress)}%`}
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8e8e8]">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${isError ? "bg-red-500" : "bg-accent"}`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-[#333]">{progressLabel}</span>
          <span className="text-muted">{Math.round(progress.progress)}%</span>
        </div>

        {!isDone && !isError && (
          <p className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-medium text-yellow-800">
            {t("keepOpen")}
          </p>
        )}
      </div>
    </div>
  );
}
