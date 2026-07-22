"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Grant = {
  id: string;
  status: string;
  coach: { full_name: string | null; email: string | null } | null;
};

export default function CoachAccessCard() {
  const t = useTranslations("coaching.access");
  const [email, setEmail] = useState("");
  const [grants, setGrants] = useState<Grant[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/coaching/access");
    const data = await response.json();
    if (response.ok) setGrants(data.grants ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const grant = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/coaching/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t("error"));
      setEmail("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/coaching/access", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t("error"));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel mobile-sheet mt-6 rounded-[1.6rem] p-4 md:rounded-2xl md:p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">{t("title")}</h2>
      <p className="mt-2 text-sm text-[var(--text-dim)]">{t("description")}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("emailPlaceholder")}
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <button type="button" onClick={grant} disabled={busy || !email} className="btn-accent rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60">
          {busy ? t("saving") : t("grant")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <div className="mt-4 space-y-2">
        {grants.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-[var(--text)]">{item.coach?.full_name || item.coach?.email || t("coach")}</p>
              <p className="text-xs text-muted">{t(`status.${item.status}`)}</p>
            </div>
            {item.status === "active" && (
              <button type="button" onClick={() => revoke(item.id)} disabled={busy} className="text-xs font-semibold text-[var(--coral)] disabled:opacity-60">
                {t("revoke")}
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
