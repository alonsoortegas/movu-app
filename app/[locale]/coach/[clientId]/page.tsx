import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ClientSummary from "@/components/coaching/ClientSummary";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientNutritionSummary from "@/components/coaching/ClientNutritionSummary";
import { mergeRecentWorkouts } from "@/lib/coaching/recent-workouts";
import { formatActivityDisplayName } from "@/lib/activities/display-name";
import { parseNutritionTrackingMode } from "@/lib/nutrition/tracking-mode";

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

  const [
    { data: client },
    { data: workouts },
    { data: activities },
    { data: measurements },
    { data: dailyMetrics },
    { data: nutritionPlan },
    { data: nutritionTargets },
  ] = await Promise.all([
    supabase.from("user_profiles").select("id, full_name, email, goal, nutrition_tracking_mode").eq("id", clientId).maybeSingle(),
    supabase
      .from("performed_workouts")
      .select("id, title, performed_on, started_at, status, activity_id")
      .eq("user_id", clientId)
      .order("started_at", { ascending: false })
      .limit(5),
    supabase
      .from("activities")
      .select("id, activity_name, activity_type, activity_category, source, start_date_local, start_date_utc, created_at")
      .eq("user_id", clientId)
      .order("start_date_utc", { ascending: false, nullsFirst: false })
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
    supabase
      .from("nutrition_plans")
      .select("id, title, provider_name, calories_target, starts_on")
      .eq("user_id", clientId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("nutrition_targets")
      .select("day_type, calories_target, protein_target, carbs_target, fat_target")
      .eq("user_id", clientId)
      .order("day_type"),
  ]);
  if (!client) notFound();

  const body = measurements?.[0];
  const readiness = dailyMetrics?.[0];
  const recentWorkouts = mergeRecentWorkouts(
    (workouts ?? []).map((workout) => ({
      id: workout.id,
      activityId: workout.activity_id,
      title: workout.title,
      date: workout.started_at || workout.performed_on,
      status: workout.status,
    })),
    (activities ?? []).map((activity) => ({
      id: activity.id,
      title: formatActivityDisplayName(activity),
      date: activity.start_date_local || activity.start_date_utc || activity.created_at,
    })),
    5,
  );
  const nutritionMode = parseNutritionTrackingMode(client.nutrition_tracking_mode);

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
        recentWorkouts={recentWorkouts.map((workout) => ({
          id: workout.id,
          title: workout.title,
          date: workout.date.slice(0, 10),
          status: t(`workoutStatus.${workout.status}`),
        }))}
        labels={{ recentWorkouts: t("recentWorkouts"), noWorkouts: t("noWorkouts") }}
      />
      <ClientNutritionSummary
        mode={nutritionMode}
        plan={nutritionPlan}
        targets={nutritionTargets ?? []}
        labels={{
          title: t("nutrition.title"),
          viewPdf: t("nutrition.viewPdf"),
          missingPlan: t("nutrition.missingPlan"),
          missingTargets: t("nutrition.missingTargets"),
          dayTypes: {
            hard: t("nutrition.dayTypes.hard"),
            moderate: t("nutrition.dayTypes.moderate"),
            rest: t("nutrition.dayTypes.rest"),
          },
          protein: t("nutrition.protein"),
          carbs: t("nutrition.carbs"),
          fat: t("nutrition.fat"),
        }}
      />
    </div>
  );
}
