-- =============================================================
-- Restore: pending_oauth_signups + authorize_google_signup hook
--
-- This undoes 20250729000000_remove_hook_infrastructure.sql.
-- Run this in the Supabase SQL Editor.
--
-- After running, verify the hook is configured in the Dashboard:
--   Authentication → Hooks → Before user is created
--   Hook type: Postgres function
--   Schema: public
--   Function: authorize_google_signup
-- =============================================================

-- 1. Recreate the table (idempotent)
create table if not exists public.pending_oauth_signups (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  provider     text not null default 'google',
  token_hash   text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists pending_oauth_signups_token_idx
  on public.pending_oauth_signups (token_hash);

alter table public.pending_oauth_signups enable row level security;

grant insert, select, update on public.pending_oauth_signups to service_role;

-- 2. Hook function: consumes any valid pending row (wildcard email='')
--    The pending row is inserted with email='' before the OAuth redirect.
--    The hook matches it regardless of which Google account the user picks.
create or replace function public.authorize_google_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider   text;
  v_pending_id uuid;
begin
  v_provider := event->'user'->'app_metadata'->>'provider';

  -- Only gate new Google users.
  -- For existing users signing in, DetermineAccountLinking returns AccountExists
  -- and triggerBeforeUserCreatedExternal returns nil before calling this hook.
  -- So every call here is a brand-new Google user.
  if v_provider <> 'google' then
    return '{}'::jsonb;
  end if;

  -- Find the most-recent valid pending row.
  -- email='' is the wildcard: we cannot know the Google email before the redirect.
  select id into v_pending_id
  from   public.pending_oauth_signups
  where  provider    = 'google'
    and  expires_at  > now()
    and  consumed_at is null
  order by created_at desc
  limit  1;

  if v_pending_id is null then
    -- No pending authorization. Block the INSERT.
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message',   'No account found. Please create an account before signing in with Google.'
      )
    );
  end if;

  -- Atomically consume it so it cannot be reused.
  update public.pending_oauth_signups
  set    consumed_at = now()
  where  id = v_pending_id;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.authorize_google_signup(jsonb) from public;
grant execute on function public.authorize_google_signup(jsonb) to supabase_auth_admin;
grant execute on function public.authorize_google_signup(jsonb) to postgres;

notify pgrst, 'reload schema';
