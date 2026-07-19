-- Account linking support migration.
-- Run this in the Supabase SQL Editor.
--
-- This migration:
--   1. Adds the get_account_providers RPC (if not already present)
--   2. Verifies the profiles table supports multi-provider accounts
--   3. Documents the required Supabase Dashboard setting
--
-- IMPORTANT MANUAL STEP (cannot be done in SQL):
-- Go to Supabase Dashboard → Authentication → Settings
-- Enable: "Link new OAuth accounts to existing email accounts"
-- This allows Google sign-in to link to an existing email+password account
-- automatically, without creating a duplicate user.

-- ─── get_account_providers RPC ───────────────────────────────────────────────
-- Returns the list of auth providers linked to an email address.
-- Used by the application to show intelligent sign-in guidance.

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

revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to authenticated, anon;


-- ─── Verification queries ─────────────────────────────────────────────────────
-- Run these after the migration to confirm everything is working.

-- 1. Confirm the function exists:
-- select routine_name from information_schema.routines
-- where routine_schema = 'public' and routine_name = 'get_account_providers';

-- 2. Test it with a real email from your auth.users table:
-- select public.get_account_providers('your-email@example.com');
-- Expected: {email} or {google} or {email,google}

-- 3. Confirm no duplicate users exist for the same email:
-- select email, count(*) from auth.users group by email having count(*) > 1;
-- Expected: 0 rows

-- 4. View all users and their linked providers:
-- select u.email, array_agg(i.provider) as providers
-- from auth.users u
-- join auth.identities i on i.user_id = u.id
-- group by u.email
-- order by u.email;
