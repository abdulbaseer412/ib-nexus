-- =============================================================
-- pending_oauth_signups + Before User Created Hook
--
-- Run this entire script in the Supabase SQL Editor.
-- It is idempotent: safe to run multiple times.
--
-- After running, you MUST configure the hook in the Supabase
-- Dashboard:
--   Authentication → Hooks → Before User Created
--   Hook type: Postgres function
--   Schema: public
--   Function: authorize_google_signup
-- =============================================================


-- -------------------------------------------------------------
-- 1. TABLE: public.pending_oauth_signups
--
-- A short-lived, single-use authorization token that must exist
-- before a new Google user can be created in auth.users.
-- Only the Google Sign-Up flow creates rows here.
-- Google Sign-In never touches this table.
-- -------------------------------------------------------------

create table if not exists public.pending_oauth_signups (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  provider     text not null default 'google',
  -- SHA-256 hex digest of the raw nonce. The raw nonce is sent
  -- to the browser as a cookie; only the hash is stored here.
  token_hash   text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Index for the hook lookup (email + token_hash + expiry check)
create index if not exists pending_oauth_signups_email_idx
  on public.pending_oauth_signups (lower(email));

create index if not exists pending_oauth_signups_token_idx
  on public.pending_oauth_signups (token_hash);

-- Expire rows automatically after 1 hour via a cleanup function
-- (called periodically — see function below).

-- RLS: no direct client access. All writes go through
-- service-role server actions. Reads go through the hook
-- (security definer). Clients never touch this table.
alter table public.pending_oauth_signups enable row level security;

-- No RLS policies — service-role bypasses RLS entirely.
-- Anon/authenticated roles have zero access.


-- -------------------------------------------------------------
-- 2. HOOK FUNCTION: public.authorize_google_signup
--
-- Called by Supabase BEFORE inserting a new row into auth.users.
-- Returns a JSON object. To block creation, return:
--   {"error": {"http_code": 403, "message": "..."}}
-- To allow creation, return:
--   {}
--
-- Logic:
--   - If the incoming user is NOT a new Google user (i.e. an
--     existing user signing in), allow unconditionally.
--   - If the incoming user IS a new Google user:
--       - Look for a valid, unexpired, unconsumed pending row
--         matching the email.
--       - If found: atomically mark it consumed and allow.
--       - If not found: block with 403.
--
-- The hook payload shape (Supabase auth hook v1):
--   {
--     "user": {
--       "id": "...",
--       "email": "...",
--       "app_metadata": { "provider": "google", ... },
--       "identities": [...],
--       "created_at": "...",
--       ...
--     }
--   }
-- -------------------------------------------------------------

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
  -- Extract fields from the hook payload.
  v_email    := lower(trim(event->'user'->>'email'));
  v_provider := event->'user'->'app_metadata'->>'provider';

  -- Only gate Google sign-ups. All other providers and all
  -- sign-ins (existing users) pass through unconditionally.
  -- An existing user re-authenticating via Google will have
  -- identities already present; Supabase does not call the
  -- Before User Created hook for existing users — it is only
  -- called when a brand-new auth.users row is about to be
  -- inserted. So any call here for provider=google is a new user.
  if v_provider <> 'google' then
    return '{}'::jsonb;
  end if;

  -- Attempt to atomically consume a valid pending authorization.
  -- The UPDATE ... RETURNING pattern is atomic under Postgres
  -- MVCC: exactly one concurrent caller can consume a given row.
  update public.pending_oauth_signups
  set    consumed_at = now()
  where  lower(email) = v_email
    and  provider     = 'google'
    and  expires_at   > now()
    and  consumed_at  is null
  returning id into v_pending_id;

  if v_pending_id is null then
    -- No valid authorization found. Block the user creation.
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message',   'No account found. Please create an account before signing in with Google.'
      )
    );
  end if;

  -- Authorization consumed. Allow the user to be created.
  return '{}'::jsonb;
end;
$$;

-- The hook is called by the supabase_auth_admin role internally.
-- Grant execute to that role. Also grant to postgres for testing.
revoke all on function public.authorize_google_signup(jsonb) from public;
grant execute on function public.authorize_google_signup(jsonb) to supabase_auth_admin;
grant execute on function public.authorize_google_signup(jsonb) to postgres;


-- -------------------------------------------------------------
-- 3. CLEANUP FUNCTION: public.cleanup_pending_oauth_signups
--
-- Deletes rows that are either:
--   - expired (expires_at < now()), or
--   - consumed more than 1 hour ago.
--
-- Call this from a pg_cron job or manually. It is safe to call
-- at any time and has no effect on active authorizations.
-- -------------------------------------------------------------

create or replace function public.cleanup_pending_oauth_signups()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.pending_oauth_signups
  where expires_at < now()
     or consumed_at < now() - interval '1 hour';
$$;

revoke all on function public.cleanup_pending_oauth_signups() from public;
grant execute on function public.cleanup_pending_oauth_signups() to postgres;
grant execute on function public.cleanup_pending_oauth_signups() to service_role;


-- -------------------------------------------------------------
-- 4. SERVICE-ROLE INSERT PERMISSION
--
-- The server action that creates pending rows uses the
-- service-role client, which bypasses RLS. No explicit grant
-- needed for DML when using service_role — but we add it
-- explicitly for clarity and forward-compatibility.
-- -------------------------------------------------------------

grant insert, select, update on public.pending_oauth_signups to service_role;


-- -------------------------------------------------------------
-- 5. SCHEMA CACHE RELOAD
-- -------------------------------------------------------------

notify pgrst, 'reload schema';


-- =============================================================
-- AFTER RUNNING THIS MIGRATION:
--
-- Go to Supabase Dashboard:
--   Authentication → Hooks → "Add hook"
--   Event:         "Before user is created"
--   Hook type:     "Postgres function"
--   Schema:        public
--   Function name: authorize_google_signup
--
-- Save the hook. It will now fire before every new user insert.
--
-- VERIFICATION QUERIES (run separately after migration):
--
-- 1. Confirm the hook function exists:
--    select routine_name, security_type
--    from information_schema.routines
--    where routine_schema = 'public'
--      and routine_name = 'authorize_google_signup';
--
-- 2. Confirm the table exists:
--    select column_name, data_type
--    from information_schema.columns
--    where table_schema = 'public'
--      and table_name = 'pending_oauth_signups'
--    order by ordinal_position;
--
-- 3. Test the hook blocks unknown Google sign-in (simulate):
--    select public.authorize_google_signup(
--      '{"user": {"email": "unknown@example.com",
--                 "app_metadata": {"provider": "google"}}}'::jsonb
--    );
--    -- Expected: {"error": {"http_code": 403, "message": "..."}}
--
-- 4. Test the hook allows a pending signup:
--    insert into public.pending_oauth_signups
--      (email, provider, token_hash, expires_at)
--    values
--      ('test@example.com', 'google', 'testhash', now() + interval '10 minutes');
--
--    select public.authorize_google_signup(
--      '{"user": {"email": "test@example.com",
--                 "app_metadata": {"provider": "google"}}}'::jsonb
--    );
--    -- Expected: {}
--
--    select consumed_at from public.pending_oauth_signups
--    where email = 'test@example.com';
--    -- Expected: consumed_at is not null
-- =============================================================
