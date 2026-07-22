create table public.nutrition_plans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.user_profiles (id) on delete cascade,
  title             text not null check (length(btrim(title)) > 0),
  provider_name     text,
  calories_target   int check (calories_target is null or calories_target between 500 and 10000),
  starts_on         date not null,
  ends_on           date,
  storage_path      text not null unique,
  original_filename text not null,
  mime_type         text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  notes             text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create unique index nutrition_plans_one_active_per_user
  on public.nutrition_plans (user_id) where active;
create index nutrition_plans_user_dates
  on public.nutrition_plans (user_id, starts_on desc, created_at desc);

alter table public.nutrition_plans enable row level security;

create policy "nutrition_plans_select_owner_or_coach"
  on public.nutrition_plans for select to authenticated
  using ((select auth.uid()) = user_id or private.can_coach_read(user_id));
create policy "nutrition_plans_insert_owner"
  on public.nutrition_plans for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "nutrition_plans_update_owner"
  on public.nutrition_plans for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "nutrition_plans_delete_owner"
  on public.nutrition_plans for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.nutrition_plans to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nutrition-plans', 'nutrition-plans', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_read_nutrition_plan_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  owner_segment text := split_part(object_name, '/', 1);
  owner_id uuid;
begin
  if owner_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return false;
  end if;
  owner_id := owner_segment::uuid;
  return owner_id = (select auth.uid()) or private.can_coach_read(owner_id);
end;
$$;

revoke all on function private.can_read_nutrition_plan_object(text) from public, anon;
grant execute on function private.can_read_nutrition_plan_object(text) to authenticated;

create policy "nutrition_plan_objects_select_owner_or_coach"
  on storage.objects for select to authenticated
  using (bucket_id = 'nutrition-plans' and private.can_read_nutrition_plan_object(name));
create policy "nutrition_plan_objects_insert_owner"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'nutrition-plans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "nutrition_plan_objects_update_owner"
  on storage.objects for update to authenticated
  using (bucket_id = 'nutrition-plans' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'nutrition-plans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "nutrition_plan_objects_delete_owner"
  on storage.objects for delete to authenticated
  using (bucket_id = 'nutrition-plans' and (storage.foldername(name))[1] = (select auth.uid())::text);
