-- sleep_logs: WHOOP sleep detail fields
alter table sleep_logs
  add column if not exists whoop_sleep_id          uuid unique,
  add column if not exists performance_pct         numeric,
  add column if not exists consistency_pct         numeric,
  add column if not exists efficiency_pct          numeric,
  add column if not exists respiratory_rate        numeric,
  add column if not exists rem_hours               numeric,
  add column if not exists deep_hours              numeric,
  add column if not exists light_hours             numeric,
  add column if not exists awake_hours             numeric,
  add column if not exists cycle_count             int,
  add column if not exists disturbance_count       int,
  add column if not exists sleep_needed_baseline_h numeric,
  add column if not exists sleep_needed_debt_h     numeric,
  add column if not exists sleep_needed_strain_h   numeric;

-- daily_metrics: one row per user per day — recovery score, HRV, strain from WHOOP cycle
create table daily_metrics (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  date                date not null,
  whoop_cycle_id      bigint,
  recovery_score      numeric,   -- 0–100
  hrv_ms              numeric,   -- RMSSD in milliseconds
  resting_hr_bpm      numeric,
  spo2_pct            numeric,
  skin_temp_c         numeric,
  daily_strain        numeric,   -- WHOOP cycle strain 0–21
  daily_avg_hr        numeric,
  daily_max_hr        numeric,
  total_calories_kcal numeric,   -- full-day TDEE from kilojoule / 4.184
  active_min          int,
  source              text not null default 'whoop',
  created_at          timestamptz default now(),
  unique (user_id, date)
);

alter table daily_metrics enable row level security;

create policy "own_daily_metrics" on daily_metrics
  for all using (auth.uid() = user_id);

create index daily_metrics_user_date on daily_metrics (user_id, date desc);
