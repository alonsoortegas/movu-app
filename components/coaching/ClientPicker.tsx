"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";

export type CoachClientListItem = {
  id: string;
  name: string;
  email: string | null;
  goal: string | null;
  latestWorkout: string | null;
};

export default function ClientPicker({
  clients,
  labels,
}: {
  clients: CoachClientListItem[];
  labels: { search: string; empty: string; latestWorkout: string; open: string };
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter((client) =>
      `${client.name} ${client.email ?? ""} ${client.goal ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [clients, query]);

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={labels.search}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-accent"
      />
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-dim)]">
          {labels.empty}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/coach/${client.id}`}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[rgba(107,224,64,0.45)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-[var(--text)]">{client.name}</h2>
                  <p className="mt-1 text-xs text-[var(--text-faint)]">{client.email}</p>
                </div>
                <span className="text-xs font-semibold text-accent">{labels.open} →</span>
              </div>
              {client.goal && <p className="mt-4 text-sm text-[var(--text-dim)]">{client.goal}</p>}
              <p className="mt-3 text-xs text-[var(--text-faint)]">
                {labels.latestWorkout}: {client.latestWorkout ?? "—"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
