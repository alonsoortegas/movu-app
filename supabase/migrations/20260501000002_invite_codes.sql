create table invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  created_by  uuid references auth.users,
  max_uses    int default 1,
  uses_count  int default 0,
  expires_at  timestamptz,
  active      boolean default true,
  note        text,
  created_at  timestamptz default now()
);

alter table invite_codes enable row level security;

-- All access goes through service_role key in Edge Functions
create policy "no_client_access" on invite_codes
  for all using (false);
