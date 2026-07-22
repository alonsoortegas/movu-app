type SummaryMetric = { label: string; value: string };

export default function ClientSummary({
  metrics,
  recentWorkouts,
  labels,
}: {
  metrics: SummaryMetric[];
  recentWorkouts: Array<{ id: string; title: string; date: string; status: string }>;
  labels: { recentWorkouts: string; noWorkouts: string };
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-faint)]">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text)]">{metric.value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="font-semibold text-[var(--text)]">{labels.recentWorkouts}</h2>
        {recentWorkouts.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-dim)]">{labels.noWorkouts}</p>
        ) : (
          <div className="mt-4 divide-y divide-[var(--border)]">
            {recentWorkouts.map((workout) => (
              <div key={workout.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium text-[var(--text)]">{workout.title}</span>
                <span className="text-[var(--text-faint)]">{workout.date} · {workout.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
