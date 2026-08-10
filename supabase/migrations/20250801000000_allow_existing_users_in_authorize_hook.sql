-- =============================================================
-- Fix: authorize_google_signup must NOT block existing users
--
-- Problem
--   The hook fires not only for brand-new Google sign-ups but
--   also for Google SIGN-INS of users who already have an
--   IB Nexus account (verified via callback-debug.log:
--   intent=signin callbacks returning access_denied with message
--   "No account found. Please create an account before signing in
--   with Google."). The sign-in flow never creates a
--   pending_oauth_signups row, so existing users were blocked at
--   the provider level and the app then showed "No account found"
--   on /login — even though the app itself had just detected the
--   same account one step earlier.
--
-- Fix
--   If the Google email already has a row in auth.users, this is
--   an existing-user sign-in → allow unconditionally.
--   Only truly-new emails still require a valid pending signup row.
--
-- Security
--   The pending-row gate is preserved for every new email, so
--   unknown Google accounts still cannot create an auth.users row
--   without the signup flow having created an authorization.
--   Allowing an existing email through the hook simply lets the
--   normal OAuth linking/sign-in proceed — the same thing the
--   app's own callback enforces via the intent branches.
-- =============================================================

create or replace function public.authorize_google_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email      text;
  v_provider   text;
  v_pending_id uuid;
begin
  v_email    := lower(trim(coalesce(event->'user'->>'email', '')));
  v_provider := event->'user'->'app_metadata'->>'provider';

  -- Only gate Google users. All other providers pass through.
  if v_provider <> 'google' then
    return '{}'::jsonb;
  end if;

  -- Existing IB Nexus account → this is a Google SIGN-IN, allow.
  -- The hook runs for OAuth sign-ins too (not just sign-ups), and
  -- sign-ins never create a pending_oauth_signups row. Without
  -- this branch every existing Google user is rejected with 403
  -- "No account found. Please create an account..." and the app
  -- wrongly reports the account as unknown.
  if v_email <> '' and exists (
    select 1 from auth.users where lower(email) = v_email
  ) then
    return '{}'::jsonb;
  end if;

  -- Brand-new email: require a valid, unconsumed pending signup
  -- authorization (created by createPendingGoogleSignup before the
  -- OAuth redirect). Consume exactly one row.
  select id into v_pending_id
  from   public.pending_oauth_signups
  where  provider    = 'google'
    and  expires_at  > now()
    and  consumed_at is null
  order by created_at desc
  limit  1;

  if v_pending_id is null then
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

-- =============================================================
-- AFTER RUNNING THIS MIGRATION
--   Run in the Supabase SQL Editor. The hook is already wired to
--   "Before user is created" in the Dashboard — no re-wiring
--   needed; this only replaces the function body.
--
-- VERIFICATION
--   select public.authorize_google_signup(
--     '{"user": {"email": "existing@example.com",
--                "app_metadata": {"provider": "google"}}}'::jsonb
--   );
--   -- Returns {} when existing@example.com is in auth.users.
--   select public.authorize_google_signup(
--     '{"user": {"email": "unknown@example.com",
--                "app_metadata": {"provider": "google"}}}'::jsonb
--   );
--   -- Still blocks with 403 when no pending row exists.
-- =============================================================
