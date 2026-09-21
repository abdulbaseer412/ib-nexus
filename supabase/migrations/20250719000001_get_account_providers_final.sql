-- =============================================================
-- get_account_providers — definitive installation
--
-- Run this entire script in Supabase SQL Editor.
-- It is idempotent: safe to run multiple times.
--
-- After running, execute the three verification queries at the
-- bottom to confirm the function exists, returns real data,
-- and is visible to PostgREST before testing the UI.
-- =============================================================


-- -------------------------------------------------------------
-- 1. CREATE THE FUNCTION
-- -------------------------------------------------------------
-- Reads auth.identities to return every provider linked to the
-- given email address. Called by the server action
-- getEmailProviders() via supabase.rpc("get_account_providers").
--
-- Returns:
--   {google}         — Google-only account
--   {email}          — email+password account
--   {email,google}   — account with both methods linked
--   {}               — email does not exist in auth.users

create or replace function public.get_account_providers(email_input text)
returns text[]
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(i.provider order by i.provider)
      from auth.users u
      join auth.identities i on i.user_id = u.id
      where lower(u.email) = lower(trim(email_input))
    ),
    array[]::text[]
  );
$$;


-- -------------------------------------------------------------
-- 2. PERMISSIONS
-- -------------------------------------------------------------
-- Revoke from public first (defensive), then grant to the two
-- roles that need it:
--   anon        — unauthenticated users on sign-in / sign-up pages
--   authenticated — signed-in users (e.g. settings page)

revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to anon;
grant execute on function public.get_account_providers(text) to authenticated;


-- -------------------------------------------------------------
-- 3. FORCE POSTGREST SCHEMA CACHE RELOAD
-- -------------------------------------------------------------
-- PostgREST caches the database schema at startup and refreshes
-- on a timer. A newly created function will return PGRST202
-- ("Could not find the function in the schema cache") until the
-- cache is refreshed.
--
-- This NOTIFY call signals PostgREST to reload immediately
-- without restarting the service.

notify pgrst, 'reload schema';


-- =============================================================
-- VERIFICATION — run each query separately after the script
-- above completes. All three must pass before testing the UI.
-- =============================================================

-- Query 1: Confirm the function exists with the correct signature.
-- Expected: one row — get_account_providers | DEFINER
--
-- select
--   routine_name,
--   security_type
-- from information_schema.routines
-- where routine_schema = 'public'
--   and routine_name = 'get_account_providers';


-- Query 2: Confirm the function returns real data.
-- Replace the email with one that exists in your auth.users table.
-- Expected: {google}  or  {email}  or  {email,google}
-- If you get {} the email does not exist or has no identity rows.
--
-- select public.get_account_providers('your-email@example.com');


-- Query 3: List all users and their linked providers.
-- Use this to find a real email to test with in Query 2.
-- Expected: one row per user showing their provider(s).
--
-- select
--   u.email,
--   array_agg(i.provider order by i.provider) as providers
-- from auth.users u
-- join auth.identities i on i.user_id = u.id
-- group by u.email
-- order by u.email;
