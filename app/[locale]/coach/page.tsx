import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import ClientPicker from "@/components/coaching/ClientPicker";
import { createClient } from "@/lib/supabase/server";

export default async function CoachPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
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

  const { data: grants } = await supabase
    .from("coach_client_access")
    .select("client_id")
    .eq("coach_id", user.id)
    .eq("status", "active");
  const clientIds = (grants ?? []).map((grant) => grant.client_id);

  const [{ data: profiles }, { data: workouts }] = await Promise.all([
    clientIds.length
      ? supabase.from("user_profiles").select("id, full_name, email, goal").in("id", clientIds)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? supabase
          .from("performed_workouts")
          .select("user_id, title, performed_on")
          .in("user_id", clientIds)
          .order("performed_on", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const latestByClient = new Map<string, string>();
  for (const workout of workouts ?? []) {
    if (!latestByClient.has(workout.user_id)) {
      latestByClient.set(workout.user_id, `${workout.title} · ${workout.performed_on}`);
    }
  }

  const clients = (profiles ?? []).map((profile) => ({
    id: profile.id,
    name: profile.full_name || profile.email || t("unnamedClient"),
    email: profile.email,
    goal: profile.goal,
    latestWorkout: latestByClient.get(profile.id) ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 lg:px-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{t("eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--text)]">{t("title")}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{t("description")}</p>
      </header>
      <ClientPicker
        clients={clients}
        labels={{ search: t("search"), empty: t("empty"), latestWorkout: t("latestWorkout"), open: t("open") }}
      />
    </div>
  );
}
