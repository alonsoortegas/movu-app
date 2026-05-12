-- Allow server-side Supabase requests using the service_role JWT to update
-- WHOOP OAuth token columns, while still blocking browser anon/authenticated
-- writes to those sensitive fields.

create or replace function protect_token_columns()
returns trigger language plpgsql security definer as $$
begin
  if auth.role() <> 'service_role' then
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
