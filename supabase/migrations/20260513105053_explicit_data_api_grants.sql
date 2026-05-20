-- Supabase Data API exposure is now explicit for new public tables.
-- Keep these grants in sync with RLS policies when adding new API-backed tables.

grant select, insert, update, delete on table
  public.user_profiles,
  public.activities,
  public.sleep_logs,
  public.body_measurements,
  public.daily_metrics,
  public.insights
to authenticated;

grant select, insert on table public.waitlist to anon;
grant usage, select on sequence public.waitlist_position_seq to anon;

grant select, insert, update, delete on table
  public.invite_codes,
  public.waitlist,
  public.user_profiles,
  public.activities,
  public.sleep_logs,
  public.body_measurements,
  public.daily_metrics,
  public.insights
to service_role;

grant usage, select on sequence public.waitlist_position_seq to service_role;
