import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ClientSummary from "@/components/coaching/ClientSummary";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

function value(number: number | null | undefined, suffix = "") {
  return typeof number === "number" ? `${number.toFixed(1)}${suffix}` : "—";
}

export default async function CoachClientPage({
  params,
}: {
  params: Promise<{ locale: string; clientId: string }>;
}) {
  const { locale, clientId } = await params;
  const t = await getTranslations({ locale, namespace: "coaching" });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}`);

  const { data: coachProfile } = await supabase
    .from("user_profiles")
    .select("account_role")
    .eq("id", user.id)
    .single();
  if (coachProfile?.account_role !== "coach") redirect(`/${locale}/dashboard`);

  const [{ data: client }, { data: workouts }, { data: measurements }, { data: dailyMetrics }] = await Promise.all([
    supabase.from("user_profiles").select("id, full_name, email, goal").eq("id", clientId).maybeSingle(),
    supabase
      .from("performed_workouts")
      .select("id, title, performed_on, status")
      .eq("user_id", clientId)
      .order("performed_on", { ascending: false })
      .limit(10),
    supabase
      .from("body_measurements")
      .select("weight_kg, muscle_mass_kg, fat_percentage, measured_at")
      .eq("user_id", clientId)
      .order("measured_at", { ascending: false })
      .limit(1),
    supabase
      .from("daily_metrics")
      .select("recovery_score, hrv_ms, date")
      .eq("user_id", clientId)
      .order("date", { ascending: false })
      .limit(1),
  ]);
  if (!client) notFound();

  const body = measurements?.[0];
  const readiness = dailyMetrics?.[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 lg:px-10">
      <header>
        <Link href="/coach" className="text-sm font-semibold text-accent">← {t("back")}</Link>
        <h1 className="mt-4 text-3xl font-bold text-[var(--text)]">{client.full_name || client.email || t("unnamedClient")}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{client.goal || t("noGoal")}</p>
      </header>
      <ClientSummary
        metrics={[
          { label: t("metrics.weight"), value: value(body?.weight_kg, " kg") },
          { label: t("metrics.muscle"), value: value(body?.muscle_mass_kg, " kg") },
          { label: t("metrics.bodyFat"), value: value(body?.fat_percentage, "%") },
          { label: t("metrics.recovery"), value: value(readiness?.recovery_score, "%") },
        ]}
        recentWorkouts={(workouts ?? []).map((workout) => ({
          id: workout.id,
          title: workout.title,
          date: workout.performed_on,
          status: workout.status,
        }))}
        labels={{ recentWorkouts: t("recentWorkouts"), noWorkouts: t("noWorkouts") }}
      />
    </div>
  );
}
