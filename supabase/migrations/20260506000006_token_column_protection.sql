-- Prevent authenticated users from writing WHOOP token columns directly
-- via the browser (anon/authenticated role). Tokens must only be written
-- by server-side code using the service_role key.

create or replace function protect_token_columns()
returns trigger language plpgsql security definer as $$
begin
  if current_role <> 'service_role' then
    if (
      new.whoop_access_token  is distinct from old.whoop_access_token  or
      new.whoop_refresh_token is distinct from old.whoop_refresh_token or
      new.whoop_token_expires is distinct from old.whoop_token_expires or
      new.whoop_user_id       is distinct from old.whoop_user_id
    ) then
      raise exception 'token_columns_readonly'
        using hint = 'Token columns may only be updated by the server.', errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_token_column_protection
  before update on public.user_profiles
  for each row execute procedure protect_token_columns();
