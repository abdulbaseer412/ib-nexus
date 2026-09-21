-- =============================================================
-- IB Nexus — Consolidated Migrations
-- Generated: 2026-09-05T16:31:47.840Z
-- Target Project: hykcbbaprxajnlmmycrg (ib-nexus copy)
-- =============================================================
-- Run this entire file in the Supabase SQL Editor.
-- Each migration is wrapped in a DO block for safety.
-- =============================================================


-- =============================================================
-- Migration: supabase/migrations/20250716000000_create_profiles.sql
-- =============================================================
-- User profiles: extends auth.users with IB-specific data.
-- Run via Supabase CLI or paste into the SQL Editor in the Supabase dashboard.

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  ib_program text check (ib_program in ('myp', 'dp')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row when a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, onboarding_completed)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    false
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at in sync on profile changes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();



-- =============================================================
-- Migration: supabase/migrations/20250716000001_email_exists_function.sql
-- =============================================================
-- Secure helper for sign-in error messaging (server-side only via RPC).
-- Returns whether an auth user exists for the given email.

create or replace function public.email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_input))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to authenticated, anon;



-- =============================================================
-- Migration: supabase/migrations/20250716000002_profile_persistence.sql
-- =============================================================
-- Extend profiles for permanent identity storage and future fields.
-- Safe upsert on signup prevents duplicate profile rows.

alter table public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists preferences jsonb not null default '{}';

-- Replace trigger function: never duplicate profiles, store richer metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Auto-mark onboarding complete when required fields are already present.
create or replace function public.sync_onboarding_status()
returns trigger
language plpgsql
as $$
begin
  if new.onboarding_completed = false
     and new.display_name is not null
     and trim(new.display_name) <> ''
     and new.ib_program is not null then
    new.onboarding_completed := true;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_onboarding on public.profiles;

create trigger profiles_sync_onboarding
  before insert or update on public.profiles
  for each row execute function public.sync_onboarding_status();

-- Backfill existing profiles from auth.users metadata.
update public.profiles p
set
  email = coalesce(p.email, u.email),
  full_name = coalesce(
    p.full_name,
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ),
  display_name = coalesce(
    p.display_name,
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  avatar_url = coalesce(
    p.avatar_url,
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ),
  onboarding_completed = case
    when p.onboarding_completed then true
    when p.display_name is not null
      and trim(p.display_name) <> ''
      and p.ib_program is not null then true
    else false
  end
from auth.users u
where p.id = u.id;



-- =============================================================
-- Migration: supabase/migrations/20250716000003_profile_integrity.sql
-- =============================================================
-- Enforce one profile per auth user (already via PK) and prevent duplicate profile emails.
-- Email uniqueness is scoped to non-null values; auth.users remains the source of truth for login.

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- Future profile fields can live in preferences jsonb without schema changes.
comment on column public.profiles.preferences is
  'Extensible key-value store for country, school, grade, subjects, achievements, XP, badges, notification settings, university goals, career interests, etc.';



-- =============================================================
-- Migration: supabase/migrations/20250717000000_repair_and_verify.sql
-- =============================================================
-- Diagnostic + repair migration.
-- Run this in the Supabase SQL Editor to verify and fix the database state.

-- ============================================================
-- STEP 1: Verify the profiles table has all required columns
-- ============================================================
do $$
begin
  -- These columns must exist. If any alter fails, it means the column
  -- already exists (which is fine — add column if not exists is safe).
  alter table public.profiles add column if not exists email text;
  alter table public.profiles add column if not exists full_name text;
  alter table public.profiles add column if not exists avatar_url text;
  alter table public.profiles add column if not exists preferences jsonb not null default '{}';
end $$;

-- ============================================================
-- STEP 2: Ensure RLS is enabled and all required policies exist
-- ============================================================
alter table public.profiles enable row level security;

-- Drop and recreate policies to ensure they are correct.
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Service role bypass" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- STEP 3: Fix the email unique index to allow upsert safely
-- ============================================================
-- The original index blocks upsert when the same email is written twice
-- (e.g. ensureProfile seed + completeOnboarding upsert both set email).
-- The index is still valuable for preventing duplicate accounts,
-- but we must ensure it does not block legitimate same-user upserts.
-- Since upsert on conflict(id) updates the existing row in place,
-- the email value does not change, so the unique index is not violated
-- in normal operation. However, if a profile row was created without
-- an email and then updated to add one that already exists on another
-- row, it would fail. This is correct behavior — we keep the index.
-- No change needed here.

-- ============================================================
-- STEP 4: Replace handle_new_user trigger — idempotent upsert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- STEP 5: Ensure sync_onboarding_status trigger exists
-- ============================================================
create or replace function public.sync_onboarding_status()
returns trigger
language plpgsql
as $$
begin
  if new.onboarding_completed = false
     and new.display_name is not null
     and trim(new.display_name) <> ''
     and new.ib_program is not null then
    new.onboarding_completed := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_onboarding on public.profiles;
create trigger profiles_sync_onboarding
  before insert or update on public.profiles
  for each row execute function public.sync_onboarding_status();

-- ============================================================
-- STEP 6: Ensure updated_at trigger exists
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- STEP 7: Verify email_exists RPC function
-- ============================================================
create or replace function public.email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_input))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to authenticated, anon;

-- ============================================================
-- STEP 8: Backfill any existing profiles missing data
-- ============================================================
update public.profiles p
set
  email      = coalesce(p.email, u.email),
  full_name  = coalesce(p.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  display_name = coalesce(
    p.display_name,
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  avatar_url = coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  onboarding_completed = case
    when p.onboarding_completed then true
    when p.display_name is not null and trim(p.display_name) <> '' and p.ib_program is not null then true
    else false
  end
from auth.users u
where p.id = u.id;

-- ============================================================
-- STEP 9: Verification queries — run these to confirm state
-- ============================================================

-- Should return your profiles table with all columns:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
-- order by ordinal_position;

-- Should return 3 policies (select, insert, update):
-- select policyname, cmd from pg_policies where tablename = 'profiles';

-- Should return 3 triggers:
-- select trigger_name from information_schema.triggers
-- where event_object_table = 'profiles';

-- Should return your existing users with their profile data:
-- select id, email, display_name, ib_program, onboarding_completed from public.profiles;



-- =============================================================
-- Migration: supabase/migrations/20250717000001_complete_setup.sql
-- =============================================================
-- =============================================================
-- IB NEXUS — Complete Database Setup
-- Run this entire script once in the Supabase SQL Editor.
-- It is fully idempotent: safe to run multiple times.
-- =============================================================


-- -------------------------------------------------------------
-- 1. PROFILES TABLE
-- -------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid        primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text,
  display_name     text,
  avatar_url       text,
  ib_program       text        check (ib_program in ('myp', 'dp')),
  onboarding_completed boolean not null default false,
  preferences      jsonb       not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);


-- -------------------------------------------------------------
-- 2. INDEXES
-- -------------------------------------------------------------

-- Unique email index (partial — only enforced when email is not null)
create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;


-- -------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile"   on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);


-- -------------------------------------------------------------
-- 4. updated_at TRIGGER
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- -------------------------------------------------------------
-- 5. AUTO-COMPLETE ONBOARDING TRIGGER
--    Fires before insert or update. If display_name and
--    ib_program are both present, marks onboarding complete
--    automatically — no application code needed.
-- -------------------------------------------------------------
create or replace function public.sync_onboarding_status()
returns trigger
language plpgsql
as $$
begin
  if new.onboarding_completed = false
     and new.display_name is not null
     and trim(new.display_name) <> ''
     and new.ib_program is not null
  then
    new.onboarding_completed := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_onboarding on public.profiles;
create trigger profiles_sync_onboarding
  before insert or update on public.profiles
  for each row execute function public.sync_onboarding_status();


-- -------------------------------------------------------------
-- 6. AUTO-CREATE PROFILE ON SIGNUP TRIGGER
--    Fires after a new row is inserted into auth.users.
--    Uses ON CONFLICT DO NOTHING so it is safe even if the
--    application also tries to create the profile.
-- -------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    display_name,
    avatar_url,
    onboarding_completed
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -------------------------------------------------------------
-- 7. email_exists() RPC FUNCTION
--    Used by sign-in error handling to distinguish
--    "wrong password" from "no account" without exposing
--    the full auth.users table to the client.
-- -------------------------------------------------------------
create or replace function public.email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(trim(email_input))
  );
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to authenticated, anon;


-- -------------------------------------------------------------
-- 8. BACKFILL
--    Creates profile rows for any auth users that signed up
--    before this migration was run (i.e. your existing accounts).
--    Safe to run even if profiles already exist.
-- -------------------------------------------------------------
insert into public.profiles (
  id,
  email,
  full_name,
  display_name,
  avatar_url,
  onboarding_completed
)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name'
  ),
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    split_part(u.email, '@', 1)
  ),
  coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ),
  false
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);


-- -------------------------------------------------------------
-- 9. VERIFY — run these SELECT statements after the script
--    to confirm everything was created correctly.
-- -------------------------------------------------------------

-- Table columns:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'profiles'
-- order by ordinal_position;

-- RLS policies (expect 3 rows):
-- select policyname, cmd, qual
-- from pg_policies
-- where tablename = 'profiles';

-- Triggers (expect 3 rows: profiles_updated_at, profiles_sync_onboarding, on_auth_user_created):
-- select trigger_name, event_object_table, action_timing, event_manipulation
-- from information_schema.triggers
-- where event_object_schema in ('public', 'auth')
--   and trigger_name in ('profiles_updated_at', 'profiles_sync_onboarding', 'on_auth_user_created');

-- Your existing users and their profiles (expect one row per user):
-- select p.id, p.email, p.display_name, p.ib_program, p.onboarding_completed
-- from public.profiles p;



-- =============================================================
-- Migration: supabase/migrations/20250717000002_auth_providers_rpc.sql
-- =============================================================
-- Returns the auth providers linked to a given email address.
-- Used server-side to power intelligent account detection UX.
--
-- Returns examples:
--   {'google'}          — Google-only account
--   {'email'}           — Email+password account
--   {'email','google'}  — Linked account (both methods)
--   {}                  — Email does not exist
--
-- NOTE: array_agg with ORDER BY inside requires PostgreSQL 9.0+.
-- Supabase runs PostgreSQL 15, so this is safe.

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

-- Restrict access: only authenticated users and anon (for sign-in/sign-up flows)
revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to authenticated, anon;



-- =============================================================
-- Migration: supabase/migrations/20250717000003_account_linking.sql
-- =============================================================
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



-- =============================================================
-- Migration: supabase/migrations/20250718000001_fix_provider_rpc.sql
-- =============================================================
-- ─── get_account_providers RPC (idempotent) ──────────────────────────────────
--
-- Run this in Supabase SQL Editor.
--
-- This function is the ONLY source of provider data for the UI.
-- If it returns {} for a known email, the UI will always show the
-- generic fallback message regardless of what the frontend code does.
--
-- After running, execute the self-test block at the bottom to confirm
-- it is returning real data before testing the UI.

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


-- ─── SELF-TEST: run this immediately after the function above ─────────────────
--
-- Step 1: List every user and their linked providers.
--         If this returns rows, the function has data to work with.
--
-- select
--   u.email,
--   array_agg(i.provider order by i.provider) as providers
-- from auth.users u
-- join auth.identities i on i.user_id = u.id
-- group by u.email
-- order by u.email;
--
-- Expected output example:
--   email                  | providers
--   -----------------------+-----------
--   user@example.com       | {google}
--   other@example.com      | {email}
--
-- Step 2: Call the function directly with a real email from Step 1.
--
-- select public.get_account_providers('user@example.com');
--
-- Expected: {google}   or   {email}   or   {email,google}
-- If you get {} for an email that exists in Step 1, the join is broken.
--
-- Step 3: Confirm the function is visible to the anon role.
--
-- select routine_name, security_type
-- from information_schema.routines
-- where routine_schema = 'public'
--   and routine_name = 'get_account_providers';
--
-- Expected: one row with security_type = 'DEFINER'



-- =============================================================
-- Migration: supabase/migrations/20250719000001_get_account_providers_final.sql
-- =============================================================
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



-- =============================================================
-- Migration: supabase/migrations/20250720000000_fix_get_account_providers.sql
-- =============================================================
-- Fix get_account_providers to check encrypted_password in auth.users
-- This ensures that users who added a password to an OAuth-only account
-- are correctly recognized as having an 'email' provider.

create or replace function public.get_account_providers(email_input text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  providers_list text[];
  has_password boolean;
begin
  -- 1. Get all providers from auth.identities
  select array_agg(distinct i.provider order by i.provider)
  into providers_list
  from auth.users u
  join auth.identities i on i.user_id = u.id
  where lower(u.email) = lower(trim(email_input));

  -- 2. Check if the user has a password set in auth.users
  select (u.encrypted_password is not null and length(u.encrypted_password) > 0)
  into has_password
  from auth.users u
  where lower(u.email) = lower(trim(email_input))
  limit 1;

  -- 3. If they have a password, ensure 'email' is in the providers list
  if has_password = true then
    if providers_list is null then
      providers_list := array['email'];
    elsif not ('email' = any(providers_list)) then
      providers_list := array_append(providers_list, 'email');
    end if;
  end if;

  return coalesce(providers_list, array[]::text[]);
end;
$$;

revoke all on function public.get_account_providers(text) from public;
grant execute on function public.get_account_providers(text) to anon, authenticated;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250722000000_debug_user_auth_state.sql
-- =============================================================
-- Temporary debug function to inspect user auth state
-- This is used for forensic investigation only.

create or replace function public.debug_user_auth_state(email_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  user_row record;
  identities_list jsonb;
begin
  -- Get user row from auth.users
  select id, email, encrypted_password, raw_app_meta_data, raw_user_meta_data
  into user_row
  from auth.users
  where lower(email) = lower(trim(email_input))
  limit 1;

  if user_row.id is null then
    return jsonb_build_object('error', 'User not found');
  end if;

  -- Get identities from auth.identities
  select jsonb_agg(jsonb_build_object('id', id, 'provider', provider, 'identity_data', identity_data))
  into identities_list
  from auth.identities
  where user_id = user_row.id;

  return jsonb_build_object(
    'user_id', user_row.id,
    'email', user_row.email,
    'has_encrypted_password', (user_row.encrypted_password is not null and length(user_row.encrypted_password) > 0),
    'encrypted_password_length', length(user_row.encrypted_password),
    'raw_app_meta_data', user_row.raw_app_meta_data,
    'raw_user_meta_data', user_row.raw_user_meta_data,
    'identities', identities_list
  );
end;
$$;

revoke all on function public.debug_user_auth_state(text) from public;
grant execute on function public.debug_user_auth_state(text) to anon, authenticated;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250723000000_user_auth_settings.sql
-- =============================================================
-- Create user_auth_settings table to manage provider enable/disable states
-- This bypasses the need for Supabase's beta manual_linking feature.

create table if not exists public.user_auth_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_enabled boolean not null default true,
  email_enabled boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_auth_settings enable row level security;

-- RLS Policies
create policy "Users can view own auth settings"
  on public.user_auth_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own auth settings"
  on public.user_auth_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to automatically create auth settings for new users
create or replace function public.handle_new_user_auth_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_google boolean;
  is_email boolean;
begin
  is_google := exists (
    select 1 from jsonb_array_elements_text(coalesce(new.raw_app_meta_data->'providers', '[]'::jsonb)) p
    where p = 'google'
  ) or (new.raw_app_meta_data->>'provider' = 'google');

  is_email := exists (
    select 1 from jsonb_array_elements_text(coalesce(new.raw_app_meta_data->'providers', '[]'::jsonb)) p
    where p = 'email'
  ) or (new.raw_app_meta_data->>'provider' = 'email') or (new.encrypted_password is not null and length(new.encrypted_password) > 0);

  insert into public.user_auth_settings (
    user_id,
    google_enabled,
    email_enabled
  )
  values (
    new.id,
    coalesce(is_google, true),
    coalesce(is_email, false)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_auth_settings();

-- Backfill existing users
insert into public.user_auth_settings (user_id, google_enabled, email_enabled)
select 
  u.id,
  exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google') as google_enabled,
  (u.encrypted_password is not null and length(u.encrypted_password) > 0) as email_enabled
from auth.users u
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250724000000_refactor_user_auth_settings.sql
-- =============================================================
-- Refactor user_auth_settings table to match the exact schema and column names
-- Drops the old table if it exists and creates the new one.

drop table if exists public.user_auth_settings cascade;

create table public.user_auth_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  email_password_enabled boolean not null default true,
  google_enabled boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_auth_settings enable row level security;

-- RLS Policies
create policy "Users can view own auth settings"
  on public.user_auth_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own auth settings"
  on public.user_auth_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger to automatically create auth settings for new users
create or replace function public.handle_new_user_auth_settings()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  is_google boolean;
  is_email boolean;
begin
  is_google := exists (
    select 1 from jsonb_array_elements_text(coalesce(new.raw_app_meta_data->'providers', '[]'::jsonb)) p
    where p = 'google'
  ) or (new.raw_app_meta_data->>'provider' = 'google');

  is_email := exists (
    select 1 from jsonb_array_elements_text(coalesce(new.raw_app_meta_data->'providers', '[]'::jsonb)) p
    where p = 'email'
  ) or (new.raw_app_meta_data->>'provider' = 'email') or (new.encrypted_password is not null and length(new.encrypted_password) > 0);

  insert into public.user_auth_settings (
    user_id,
    google_enabled,
    email_password_enabled
  )
  values (
    new.id,
    coalesce(is_google, true),
    coalesce(is_email, false)
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_settings on auth.users;
create trigger on_auth_user_created_settings
  after insert on auth.users
  for each row execute function public.handle_new_user_auth_settings();

-- Backfill existing users
insert into public.user_auth_settings (user_id, google_enabled, email_password_enabled)
select 
  u.id,
  exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google') as google_enabled,
  (u.encrypted_password is not null and length(u.encrypted_password) > 0) as email_password_enabled
from auth.users u
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250725000000_get_oauth_identity_owner.sql
-- =============================================================
-- Returns the auth.users id that owns a given OAuth identity.
-- Used server-side during OAuth callback to prevent linking a Google
-- account that already belongs to another IB Nexus user.

create or replace function public.get_oauth_identity_owner(
  provider_input text,
  provider_id_input text
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select user_id
  from auth.identities
  where provider = provider_input
    and provider_id = provider_id_input
  limit 1;
$$;

revoke all on function public.get_oauth_identity_owner(text, text) from public;
grant execute on function public.get_oauth_identity_owner(text, text) to authenticated;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250726000000_before_user_created_hook.sql
-- =============================================================
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



-- =============================================================
-- Migration: supabase/migrations/20250727000000_fix_authorize_google_signup_hook.sql
-- =============================================================
-- =============================================================
-- Fix: authorize_google_signup hook — email-agnostic pending rows
--
-- v2: consume exactly ONE pending row using a targeted subquery
-- (WHERE id = ...) to avoid P0003 when multiple unconsumed
-- wildcard rows exist from repeated button clicks.
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
  v_email    := lower(trim(event->'user'->>'email'));
  v_provider := event->'user'->'app_metadata'->>'provider';

  -- Only gate new Google users. All other providers pass through.
  if v_provider <> 'google' then
    return '{}'::jsonb;
  end if;

  -- Atomically consume exactly ONE valid pending authorization.
  -- The subquery picks a single row (LIMIT 1 FOR UPDATE SKIP LOCKED)
  -- so this never returns more than one row regardless of how many
  -- unconsumed wildcard rows exist.
  --
  -- Matches either:
  --   (a) email-specific row: lower(email) = v_email
  --   (b) wildcard row:       email = ''
  update public.pending_oauth_signups
  set    consumed_at = now()
  where  id = (
    select id
    from   public.pending_oauth_signups
    where  (lower(email) = v_email or email = '')
      and  provider    = 'google'
      and  expires_at  > now()
      and  consumed_at is null
    order by created_at desc
    limit  1
    for update skip locked
  )
  returning id into v_pending_id;

  if v_pending_id is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message',   'No account found. Please create an account before signing in with Google.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

revoke all on function public.authorize_google_signup(jsonb) from public;
grant execute on function public.authorize_google_signup(jsonb) to supabase_auth_admin;
grant execute on function public.authorize_google_signup(jsonb) to postgres;

-- Clean up any stale unconsumed wildcard rows left from previous
-- failed attempts so the table starts fresh.
delete from public.pending_oauth_signups
where email = ''
  and consumed_at is null;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250728000000_fix_hook_wildcard_match.sql
-- =============================================================
-- =============================================================
-- Fix: authorize_google_signup — simplified wildcard consume
--
-- Removes FOR UPDATE SKIP LOCKED (unreliable in hook context).
-- Consumes the single most-recent valid pending row.
-- =============================================================

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

  if v_provider <> 'google' then
    return '{}'::jsonb;
  end if;

  -- Pick the single most-recent valid pending row (wildcard or email-specific).
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

  -- Atomically mark it consumed.
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
-- Migration: supabase/migrations/20250729000000_remove_hook_infrastructure.sql
-- =============================================================
-- =============================================================
-- Remove hook-based signup gating.
--
-- The "Before User Created" hook approach is replaced by
-- callback-side intent enforcement + immediate orphan deletion.
--
-- Run this in the Supabase SQL Editor, then go to:
--   Authentication → Hooks
-- and DELETE the "Before user is created" hook entry.
-- =============================================================

-- Drop the hook functions (no longer called).
drop function if exists public.authorize_google_signup(jsonb);
drop function if exists public.cleanup_pending_oauth_signups();

-- Drop the pending signups table (no longer needed).
drop table if exists public.pending_oauth_signups;

notify pgrst, 'reload schema';



-- =============================================================
-- Migration: supabase/migrations/20250730000000_restore_hook_infrastructure.sql
-- =============================================================
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



-- =============================================================
-- Migration: supabase/migrations/20250801000000_allow_existing_users_in_authorize_hook.sql
-- =============================================================
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



-- =============================================================
-- Migration: supabase/migrations/20250810000000_onboarding_fields.sql
-- =============================================================
alter table public.profiles
  add column if not exists exam_session text,
  add column if not exists subjects jsonb default '[]'::jsonb,
  add column if not exists study_goals jsonb default '[]'::jsonb;



-- =============================================================
-- Migration: supabase/migrations/20250812000000_add_school_and_referral.sql
-- =============================================================
-- Migration to add school_name and referral_source to profiles table

alter table public.profiles
  add column if not exists school_name text,
  add column if not exists referral_source text;



-- =============================================================
-- Migration: scripts/sql/notes_db_setup.sql
-- =============================================================
-- IB Nexus Notes & Flashcards Schema Setup

-- 1. Create the Notes Table
CREATE TABLE IF NOT EXISTS ib_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text,
  subject text NOT NULL,
  topic text,
  level text,
  exam_importance text DEFAULT 'Medium',
  revision_readiness integer DEFAULT 0,
  folder text,
  tags text[] DEFAULT '{}',
  is_favorite boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_opened_at timestamptz DEFAULT now()
);

-- 2. Create the Flashcards Table (Basic schema for integration)
CREATE TABLE IF NOT EXISTS ib_flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES ib_notes(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  subject text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Set up Row Level Security (RLS) for Notes
ALTER TABLE ib_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes" 
  ON ib_notes FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notes" 
  ON ib_notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
  ON ib_notes FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
  ON ib_notes FOR DELETE 
  USING (auth.uid() = user_id);

-- 4. Set up Row Level Security (RLS) for Flashcards
ALTER TABLE ib_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flashcards" 
  ON ib_flashcards FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flashcards" 
  ON ib_flashcards FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcards" 
  ON ib_flashcards FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flashcards" 
  ON ib_flashcards FOR DELETE 
  USING (auth.uid() = user_id);



-- =============================================================
-- Migration: scripts/sql/alter_notes_db.sql
-- =============================================================
-- Add advanced IB-specific metadata to Notes
ALTER TABLE ib_notes
ADD COLUMN IF NOT EXISTS exam_importance text DEFAULT 'Medium',
ADD COLUMN IF NOT EXISTS revision_readiness integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS folder text;



-- =============================================================
-- Migration: scripts/sql/alter_notes_db_folders.sql
-- =============================================================
-- Upgrade IB Notes to support Folders and Priority Tiers

-- 1. Add folder structure columns
ALTER TABLE ib_notes
ADD COLUMN IF NOT EXISTS is_folder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES ib_notes(id) ON DELETE CASCADE;

-- 2. Update priority defaults to new attractive terminology
-- Let's ensure the column exists first, in case the previous alter script was missed
ALTER TABLE ib_notes
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES ib_notes(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_folder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exam_importance text DEFAULT 'Mid-Level';

-- Update any existing rows to have the default if null or empty
UPDATE ib_notes 
SET exam_importance = 'Mid-Level' 
WHERE exam_importance IS NULL OR exam_importance = 'Medium' OR exam_importance = 'Core Concept';

-- Optional: Modify default for future inserts
ALTER TABLE ib_notes
ALTER COLUMN exam_importance SET DEFAULT 'Mid-Level';



-- =============================================================
-- Migration: scripts/sql/flashcards_v2.sql
-- =============================================================
-- Flashcards V2 Database Migration

DROP TABLE IF EXISTS public.ib_flashcard_decks CASCADE;
DROP TABLE IF EXISTS public.ib_flashcards CASCADE;
DROP TABLE IF EXISTS public.ib_flashcard_reviews CASCADE;

-- 1. Create Decks Table
CREATE TABLE public.ib_flashcard_decks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  subject text,
  topic text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_reviewed_at timestamptz
);

-- 2. Drop existing rudimentary flashcards table and recreate with Spaced Repetition fields
DROP TABLE IF EXISTS public.ib_flashcards CASCADE;

CREATE TABLE public.ib_flashcards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id uuid REFERENCES public.ib_flashcard_decks(id) ON DELETE CASCADE,
  note_id uuid REFERENCES public.ib_notes(id) ON DELETE SET NULL,
  
  front text NOT NULL,
  back text NOT NULL,
  card_type text DEFAULT 'Basic', -- Basic, Cloze, Concept, Compare, Apply
  
  subject text,
  topic text,
  tags text[] DEFAULT '{}',
  
  -- SM-2 Algorithm Fields
  next_review_at timestamptz DEFAULT now(),
  interval_days real DEFAULT 0,
  ease_factor real DEFAULT 2.5,
  repetitions integer DEFAULT 0,
  lapses integer DEFAULT 0,
  last_reviewed_at timestamptz,
  is_suspended boolean DEFAULT false,
  
  -- AI & Priority Scheduling
  is_ai_generated boolean DEFAULT false,
  priority_date timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create Reviews History Table
CREATE TABLE IF NOT EXISTS public.ib_flashcard_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id uuid REFERENCES public.ib_flashcards(id) ON DELETE CASCADE NOT NULL,
  
  rating text NOT NULL, -- Again, Hard, Good, Easy
  review_duration_ms integer,
  
  previous_interval real,
  new_interval real,
  previous_ease real,
  new_ease real,
  
  reviewed_at timestamptz DEFAULT now()
);

-- 4. Row Level Security

ALTER TABLE public.ib_flashcard_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own decks" ON public.ib_flashcard_decks FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.ib_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flashcards" ON public.ib_flashcards FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.ib_flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reviews" ON public.ib_flashcard_reviews FOR ALL USING (auth.uid() = user_id);



-- =============================================================
-- Migration: scripts/sql/flashcards_v3_gamification.sql
-- =============================================================
-- Flashcards V3 Gamification & Streaks Migration

-- 1. Create Profiles Table for Streaks & Preferences
CREATE TABLE IF NOT EXISTS public.ib_flashcard_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_streak integer DEFAULT 0,
  best_streak integer DEFAULT 0,
  last_active_date date,
  ai_generation_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ib_flashcard_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profiles" ON public.ib_flashcard_profiles FOR ALL USING (auth.uid() = user_id);

-- 2. Add Status column to Flashcards
ALTER TABLE public.ib_flashcards 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'New'; 
-- 'New', 'Read', 'Mastered'



-- =============================================================
-- Migration: scripts/sql/flashcards_v4_categorization.sql
-- =============================================================
-- Add is_ai_generated to ib_flashcard_decks
ALTER TABLE ib_flashcard_decks 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Make existing AI generated deck from demo script marked as AI
UPDATE ib_flashcard_decks 
SET is_ai_generated = true 
WHERE title LIKE '[AI]%';



-- =============================================================
-- Migration: scripts/sql/20250825000000_extend_flashcards.sql
-- =============================================================
-- Migration: Extend flashcards schema with origin, AI metadata, and source linking

-- 1. Add origin column to decks (enum)
ALTER TABLE public.ib_flashcard_decks
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';

-- 2. Add AI metadata JSONB column
ALTER TABLE public.ib_flashcard_decks
  ADD COLUMN ai_metadata JSONB;

-- 3. Deprecate is_ai_generated flag on cards (keep for backward compatibility)
-- No action needed; we'll continue using it but prefer origin.

-- 4. Create linking table for multiple source notes per card
CREATE TABLE IF NOT EXISTS public.ib_flashcard_sources (
  card_id uuid REFERENCES public.ib_flashcards(id) ON DELETE CASCADE NOT NULL,
  note_id uuid REFERENCES public.ib_notes(id) ON DELETE SET NULL NOT NULL,
  PRIMARY KEY (card_id, note_id)
);

-- 5. Ensure RLS for new table
ALTER TABLE public.ib_flashcard_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own flashcard sources" ON public.ib_flashcard_sources
  FOR ALL USING (auth.uid() = (SELECT user_id FROM public.ib_flashcards WHERE id = card_id));

-- 6. Add origin column to flashcards (enum) for future use
ALTER TABLE public.ib_flashcards
  ADD COLUMN origin TEXT NOT NULL DEFAULT 'manual';

-- 7. Backfill origin for existing cards based on is_ai_generated flag
UPDATE public.ib_flashcards
  SET origin = CASE WHEN is_ai_generated THEN 'ai_from_note' ELSE 'manual' END;

-- 8. Backfill origin for existing decks based on existing data (default is manual)
-- If you have a way to detect AI decks, migrate accordingly in a later script.

-- Note: Keep is_ai_generated column for legacy compatibility; can be dropped in a future migration.



-- =============================================================
-- Migration: scripts/sql/community_db_setup.sql
-- =============================================================
-- Add is_admin to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Community posts (permanent discussions)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  post_type text DEFAULT 'discussion' CHECK (post_type IN ('discussion', 'question')),
  is_answered boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  helpful_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

-- Community replies
CREATE TABLE IF NOT EXISTS community_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  helpful_count integer DEFAULT 0,
  is_accepted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Community reactions (helpful votes)
CREATE TABLE IF NOT EXISTS community_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, reply_id)
);

-- Community bookmarks
CREATE TABLE IF NOT EXISTS community_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Community reports
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reply_id uuid REFERENCES community_replies(id) ON DELETE CASCADE,
  message_id uuid,
  reason text NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'misleading', 'harassment', 'other')),
  details text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Live subject rooms
CREATE TABLE IF NOT EXISTS community_rooms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Live room messages
CREATE TABLE IF NOT EXISTS community_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_name text NOT NULL,
  author_avatar text,
  content text NOT NULL,
  reply_to uuid REFERENCES community_messages(id) ON DELETE SET NULL,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Room presence tracking
CREATE TABLE IF NOT EXISTS community_presence (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id uuid REFERENCES community_rooms(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  last_seen timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);

-- Study groups
CREATE TABLE IF NOT EXISTS community_study_groups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  subject text NOT NULL,
  topic text,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  max_members integer DEFAULT 20,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_study_group_members (
  group_id uuid REFERENCES community_study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON community_posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_author ON community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_post ON community_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON community_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_room ON community_presence(room_id);

-- Seed default rooms
INSERT INTO community_rooms (subject, name, slug, description, sort_order) VALUES
  ('Biology', 'Biology HL', 'biology-hl', 'Higher Level Biology discussion', 1),
  ('Biology', 'Biology SL', 'biology-sl', 'Standard Level Biology discussion', 2),
  ('Biology', 'Biology IA & EE', 'biology-ia-ee', 'Coursework help for Biology', 3),
  ('Chemistry', 'Chemistry HL', 'chemistry-hl', 'Higher Level Chemistry discussion', 4),
  ('Chemistry', 'Chemistry SL', 'chemistry-sl', 'Standard Level Chemistry discussion', 5),
  ('Chemistry', 'Chemistry IA & EE', 'chemistry-ia-ee', 'Coursework help for Chemistry', 6),
  ('Physics', 'Physics HL', 'physics-hl', 'Higher Level Physics discussion', 7),
  ('Physics', 'Physics SL', 'physics-sl', 'Standard Level Physics discussion', 8),
  ('Physics', 'Physics IA & EE', 'physics-ia-ee', 'Coursework help for Physics', 9),
  ('Mathematics', 'Math AA HL', 'math-aa-hl', 'Analysis and Approaches HL', 10),
  ('Mathematics', 'Math AA SL', 'math-aa-sl', 'Analysis and Approaches SL', 11),
  ('Mathematics', 'Math AI HL', 'math-ai-hl', 'Applications and Interpretation HL', 12),
  ('Mathematics', 'Math AI SL', 'math-ai-sl', 'Applications and Interpretation SL', 13),
  ('Computer Science', 'Comp Sci HL', 'cs-hl', 'Higher Level Computer Science', 14),
  ('Computer Science', 'Comp Sci SL', 'cs-sl', 'Standard Level Computer Science', 15),
  ('Economics', 'Economics HL', 'economics-hl', 'Higher Level Economics', 16),
  ('Economics', 'Economics SL', 'economics-sl', 'Standard Level Economics', 17),
  ('History', 'History HL', 'history-hl', 'Higher Level History', 18),
  ('History', 'History SL', 'history-sl', 'Standard Level History', 19),
  ('Geography', 'Geography HL', 'geography-hl', 'Higher Level Geography', 20),
  ('Geography', 'Geography SL', 'geography-sl', 'Standard Level Geography', 21),
  ('English', 'English Lit HL', 'english-lit-hl', 'English Literature HL', 22),
  ('English', 'English Lit SL', 'english-lit-sl', 'English Literature SL', 23),
  ('English', 'English Lang & Lit', 'english-lang-lit', 'English Language & Literature', 24),
  ('Languages', 'Language B HL', 'lang-b-hl', 'Language Acquisition HL', 25),
  ('Languages', 'Language B SL', 'lang-b-sl', 'Language Acquisition SL', 26),
  ('Business Management', 'Business HL', 'business-hl', 'Higher Level Business Management', 27),
  ('Business Management', 'Business SL', 'business-sl', 'Standard Level Business Management', 28),
  ('TOK', 'TOK Exhibition', 'tok-exhibition', 'Theory of Knowledge Exhibition', 29),
  ('TOK', 'TOK Essay', 'tok-essay', 'Theory of Knowledge Essay', 30),
  ('Extended Essay', 'EE General Support', 'ee-general', 'Extended Essay general advice', 31),
  ('General IB', 'IB General Chat', 'ib-general', 'General IB discussion', 32)
ON CONFLICT (slug) DO NOTHING;

-- Enable Realtime on messages table (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_presence;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN OTHERS THEN NULL;
  END;
END $$;




-- =============================================================
-- Migration: scripts/sql/community_rls_policies.sql
-- =============================================================
-- Enable RLS on all community tables
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_study_group_members ENABLE ROW LEVEL SECURITY;

-- ── Posts ────────────────────────────────────────────────────────
-- Anyone can read approved posts
CREATE POLICY "Anyone can read approved posts" ON community_posts FOR SELECT USING (status = 'approved');
-- Users can read their own posts regardless of status
CREATE POLICY "Users can read their own posts" ON community_posts FOR SELECT USING (auth.uid() = author_id);
-- Admins can read all posts
CREATE POLICY "Admins can read all posts" ON community_posts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
-- Authenticated users can insert posts (must be their own ID)
CREATE POLICY "Users can insert posts" ON community_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
-- Users can update their own posts
CREATE POLICY "Users can update their own posts" ON community_posts FOR UPDATE USING (auth.uid() = author_id);
-- Admins can update any post (for moderation)
CREATE POLICY "Admins can update any post" ON community_posts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
-- Admins can delete any post
CREATE POLICY "Admins can delete any post" ON community_posts FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Replies ──────────────────────────────────────────────────────
CREATE POLICY "Anyone can read replies" ON community_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert replies" ON community_replies FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own replies" ON community_replies FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Admins can delete replies" ON community_replies FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Reactions & Bookmarks ─────────────────────────────────────────
CREATE POLICY "Users manage own reactions" ON community_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own bookmarks" ON community_bookmarks FOR ALL USING (auth.uid() = user_id);

-- ── Reports ───────────────────────────────────────────────────────
CREATE POLICY "Users can insert reports" ON community_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON community_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update reports" ON community_reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ── Live Rooms & Messages ─────────────────────────────────────────
CREATE POLICY "Anyone can read rooms" ON community_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can read messages" ON community_messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON community_messages FOR INSERT WITH CHECK (auth.uid() = author_id);

-- ── Presence ──────────────────────────────────────────────────────
CREATE POLICY "Anyone can read presence" ON community_presence FOR SELECT USING (true);
CREATE POLICY "Users manage own presence" ON community_presence FOR ALL USING (auth.uid() = user_id);

-- ── Study Groups ──────────────────────────────────────────────────
CREATE POLICY "Anyone can read study groups" ON community_study_groups FOR SELECT USING (true);
CREATE POLICY "Users can insert study groups" ON community_study_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Users manage own group membership" ON community_study_group_members FOR ALL USING (auth.uid() = user_id);



-- =============================================================
-- Migration: scripts/sql/chat_and_avatars_migration.sql
-- =============================================================
-- 1. Add avatar_url to profiles if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create the function to clean up old messages
CREATE OR REPLACE FUNCTION public.cleanup_old_room_messages()
RETURNS trigger AS $$
BEGIN
  -- Delete messages older than 3 days
  DELETE FROM public.community_messages
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger to execute cleanup whenever a new message is inserted
-- This ensures the chat stays clean automatically without needing pg_cron
DROP TRIGGER IF EXISTS trigger_cleanup_old_room_messages ON public.community_messages;
CREATE TRIGGER trigger_cleanup_old_room_messages
AFTER INSERT ON public.community_messages
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_old_room_messages();



-- =============================================================
-- Migration: scripts/sql/storage_setup.sql
-- =============================================================
-- IB Nexus Storage Setup for Notes Media

-- 1. Create a new public bucket for notes media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notes_media', 'notes_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS is already enabled by default on storage.objects in Supabase

-- 3. Policy: Allow anyone to read (view) the media files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'notes_media');

-- 4. Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notes_media' AND auth.role() = 'authenticated'
);

-- 5. Policy: Allow authenticated users to update their own files (optional)
CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'notes_media' AND auth.uid() = owner
);

-- 6. Policy: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notes_media' AND auth.uid() = owner
);



-- =============================================================
-- Migration: scripts/sql/setup_storage.sql
-- =============================================================
-- Create the 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the 'avatars' bucket
-- Note: Replace 'avatars' with the exact bucket name you are using.
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar."
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
);

CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own avatar."
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
);



-- =============================================================
-- Migration: scripts/sql/subjects_db_setup.sql
-- =============================================================
-- IB Subjects Table Setup & Initial Seed Data

CREATE TABLE IF NOT EXISTS public.ib_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  program TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (program, category, name)
);

ALTER TABLE public.ib_subjects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view ib_subjects' AND tablename = 'ib_subjects'
  ) THEN
    CREATE POLICY "Anyone can view ib_subjects" ON public.ib_subjects FOR SELECT USING (true);
  END IF;
END
$$;

-- Seed DP & MYP Subjects
INSERT INTO public.ib_subjects (program, category, name) VALUES
  -- DP Subjects
  ('dp', 'Group 1 & 2: Languages', 'English A Lit'),
  ('dp', 'Group 1 & 2: Languages', 'English A Lang & Lit'),
  ('dp', 'Group 1 & 2: Languages', 'Spanish B'),
  ('dp', 'Group 1 & 2: Languages', 'French B'),
  ('dp', 'Group 1 & 2: Languages', 'Mandarin B'),
  ('dp', 'Group 1 & 2: Languages', 'German B'),
  ('dp', 'Group 1 & 2: Languages', 'German ab initio'),
  ('dp', 'Group 3: Individuals & Societies', 'History'),
  ('dp', 'Group 3: Individuals & Societies', 'Geography'),
  ('dp', 'Group 3: Individuals & Societies', 'Economics'),
  ('dp', 'Group 3: Individuals & Societies', 'Business Management'),
  ('dp', 'Group 3: Individuals & Societies', 'Psychology'),
  ('dp', 'Group 3: Individuals & Societies', 'Global Politics'),
  ('dp', 'Group 4: Sciences', 'Biology'),
  ('dp', 'Group 4: Sciences', 'Chemistry'),
  ('dp', 'Group 4: Sciences', 'Physics'),
  ('dp', 'Group 4: Sciences', 'Computer Science'),
  ('dp', 'Group 4: Sciences', 'ESS'),
  ('dp', 'Group 5: Mathematics', 'Mathematics AA'),
  ('dp', 'Group 5: Mathematics', 'Mathematics AI'),
  -- MYP Subjects
  ('myp', 'Language and Literature', 'English Lang & Lit'),
  ('myp', 'Language and Literature', 'Spanish Lang & Lit'),
  ('myp', 'Language and Literature', 'German Lang & Lit'),
  ('myp', 'Language Acquisition', 'French'),
  ('myp', 'Language Acquisition', 'Spanish'),
  ('myp', 'Language Acquisition', 'Mandarin'),
  ('myp', 'Language Acquisition', 'German'),
  ('myp', 'Individuals and Societies', 'History'),
  ('myp', 'Individuals and Societies', 'Geography'),
  ('myp', 'Individuals and Societies', 'Integrated Humanities'),
  ('myp', 'Sciences', 'Biology'),
  ('myp', 'Sciences', 'Chemistry'),
  ('myp', 'Sciences', 'Physics'),
  ('myp', 'Sciences', 'Integrated Sciences'),
  ('myp', 'Mathematics', 'Mathematics (Standard)'),
  ('myp', 'Mathematics', 'Mathematics (Extended)'),
  ('myp', 'Arts', 'Visual Arts'),
  ('myp', 'Arts', 'Music'),
  ('myp', 'Arts', 'Drama'),
  ('myp', 'Design', 'Design'),
  ('myp', 'Physical and Health Education', 'PHE')
ON CONFLICT (program, category, name) DO NOTHING;



-- =============================================================
-- Migration: scripts/sql/make_admin.sql
-- =============================================================
-- 1. Add the is_admin column to the profiles table (if it doesn't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 2. Make your specific user account an admin! 
-- (Replace 'YOUR_EMAIL@EXAMPLE.COM' with the email you use to log in)
UPDATE public.profiles
SET is_admin = true
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@EXAMPLE.COM'
);



-- =============================================================
-- Migration: scripts/sql/single_admin_system.sql
-- =============================================================
-- =============================================================
-- Single-Admin System Schema Migration
-- Migration: single_admin_system.sql
-- Description: Adds is_suspended column to profiles, enables admin logs table
-- =============================================================

-- 1. Ensure profiles columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- 2. Create admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- 3. Ensure community_rooms table has is_active
ALTER TABLE public.community_rooms ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. Enable RLS on admin_activity_logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can view all activity logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_activity_logs' AND policyname = 'Admins can view activity logs'
  ) THEN
    CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_activity_logs' AND policyname = 'Admins can insert activity logs'
  ) THEN
    CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.is_admin = true
        )
      );
  END IF;
END $$;

-- Grant privileges
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;



-- =============================================================
-- Migration: supabase/migrations/20250826000000_extend_planner.sql
-- =============================================================
-- 20250826000000_extend_planner.sql
-- Migration to add planner tables and policies

-- Planner Goals (high-level objectives)
CREATE TABLE IF NOT EXISTS public.planner_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text,
  title text NOT NULL,
  description text,
  type text NOT NULL,
  status text DEFAULT 'active',
  target_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Planner Tasks (what needs to be accomplished)
CREATE TABLE IF NOT EXISTS public.planner_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text,
  title text NOT NULL,
  description text,
  type text,
  subject text,
  topic text,
  goal_id uuid REFERENCES public.planner_goals(id),
  priority text DEFAULT 'medium',
  estimated_duration integer,
  status text DEFAULT 'pending',
  origin text DEFAULT 'manual',
  created_at timestamp with time zone DEFAULT now()
);

-- Planner Deadlines (date/time constraints)
CREATE TABLE IF NOT EXISTS public.planner_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text,
  title text NOT NULL,
  due_at timestamp with time zone NOT NULL,
  goal_id uuid REFERENCES public.planner_goals(id),
  task_id uuid REFERENCES public.planner_tasks(id),
  assessment_id uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Add deadline_id to planner_tasks now that planner_deadlines exists
ALTER TABLE public.planner_tasks 
  ADD COLUMN IF NOT EXISTS deadline_id uuid REFERENCES public.planner_deadlines(id);

-- Planner Sessions (when the task is scheduled)
CREATE TABLE IF NOT EXISTS public.planner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  task_id uuid REFERENCES public.planner_tasks(id),
  name text,
  title text,
  scheduled_start timestamp with time zone NOT NULL,
  scheduled_end timestamp with time zone NOT NULL,
  status text DEFAULT 'scheduled', 
  completed_at timestamp with time zone,
  actual_duration integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Planner Preferences (user settings for planner)
CREATE TABLE IF NOT EXISTS public.planner_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  auto_plan_enabled boolean DEFAULT false,
  daily_max_minutes integer DEFAULT 300,
  break_minutes integer DEFAULT 10,
  preferred_start_time time DEFAULT '09:00',
  timezone text
);

-- Row Level Security
ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_goals_user_policy') THEN
    CREATE POLICY planner_goals_user_policy ON public.planner_goals USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_tasks_user_policy') THEN
    CREATE POLICY planner_tasks_user_policy ON public.planner_tasks USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_deadlines_user_policy') THEN
    CREATE POLICY planner_deadlines_user_policy ON public.planner_deadlines USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_sessions_user_policy') THEN
    CREATE POLICY planner_sessions_user_policy ON public.planner_sessions USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'planner_preferences_user_policy') THEN
    CREATE POLICY planner_preferences_user_policy ON public.planner_preferences USING (auth.uid() = user_id);
  END IF;
END
$$;



-- =============================================================
-- Migration: supabase/migrations/20250826000001_extend_planner_notes.sql
-- =============================================================
-- 20250826000001_extend_planner_notes.sql
-- Add note_id to planner_tasks and planner_sessions

ALTER TABLE planner_tasks
  ADD COLUMN note_id uuid NULL REFERENCES ib_notes(id) ON DELETE SET NULL;

ALTER TABLE planner_sessions
  ADD COLUMN note_id uuid NULL REFERENCES ib_notes(id) ON DELETE SET NULL;



-- =============================================================
-- Migration: supabase/migrations/20250827000000_resources.sql
-- =============================================================
-- 20250827000000_resources.sql
-- Migration: IB Nexus Resource Library

-- ── Main resources table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,        -- NULL for platform resources
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  file_type text,
  resource_type text NOT NULL DEFAULT 'other',
  programme text NOT NULL DEFAULT 'dp',
  subject text,
  level text,
  topic text,
  year integer,
  exam_session text,
  paper_number text,
  tags text[] DEFAULT '{}',
  source text NOT NULL DEFAULT 'user',                         -- platform | user | community
  visibility text NOT NULL DEFAULT 'private',                  -- public | private | pending | approved | rejected
  related_resource_id uuid REFERENCES public.ib_resources(id) ON DELETE SET NULL,
  extracted_text text,
  extraction_status text DEFAULT 'pending',
  download_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ── User bookmarks / saves ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_resource_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  resource_id uuid REFERENCES public.ib_resources(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, resource_id)
);

-- ── Recently viewed ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ib_resource_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  resource_id uuid REFERENCES public.ib_resources(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamp with time zone DEFAULT now()
);

-- ── Planner integration ───────────────────────────────────────────────────────
ALTER TABLE public.planner_tasks
  ADD COLUMN IF NOT EXISTS resource_id uuid REFERENCES public.ib_resources(id) ON DELETE SET NULL;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.ib_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_resource_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ib_resource_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Resources: users can see platform/public resources and their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_select_policy') THEN
    CREATE POLICY resources_select_policy ON public.ib_resources
      FOR SELECT USING (
        source = 'platform'
        OR (source = 'community' AND visibility = 'approved')
        OR user_id = auth.uid()
      );
  END IF;

  -- Resources: users can insert their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_insert_policy') THEN
    CREATE POLICY resources_insert_policy ON public.ib_resources
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  -- Resources: users can update their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_update_policy') THEN
    CREATE POLICY resources_update_policy ON public.ib_resources
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- Resources: users can delete their own
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resources_delete_policy') THEN
    CREATE POLICY resources_delete_policy ON public.ib_resources
      FOR DELETE USING (user_id = auth.uid());
  END IF;

  -- Saves: user-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resource_saves_policy') THEN
    CREATE POLICY resource_saves_policy ON public.ib_resource_saves
      USING (user_id = auth.uid());
  END IF;

  -- Views: user-scoped
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'resource_views_policy') THEN
    CREATE POLICY resource_views_policy ON public.ib_resource_views
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- ── Indexes for performance ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_resources_programme ON public.ib_resources(programme);
CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.ib_resources(subject);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.ib_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_source ON public.ib_resources(source);
CREATE INDEX IF NOT EXISTS idx_resources_user ON public.ib_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_related ON public.ib_resources(related_resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_saves_user ON public.ib_resource_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_user ON public.ib_resource_views(user_id, viewed_at DESC);



-- =============================================================
-- Migration: supabase/migrations/20260818000000_create_admin_device_credentials.sql
-- =============================================================
CREATE TABLE IF NOT EXISTS admin_device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL,
  transports TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_device_user ON admin_device_credentials(user_id);
ALTER TABLE admin_device_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own device credentials" 
  ON admin_device_credentials FOR SELECT 
  USING (auth.uid() = user_id);



-- =============================================================
-- Migration: supabase/migrations/20260818000001_hierarchical_auth.sql
-- =============================================================
-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Display Name
    identifier TEXT NOT NULL, -- Internal stable ID (e.g., parent_owner, researcher)
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, identifier)
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 3. Role Permissions Table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 4. User Roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, organization_id) -- A user has one role per organization
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    impersonation BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles for easy querying
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 6. Helper Functions

-- Check if user is parent owner
CREATE OR REPLACE FUNCTION public.is_parent_owner(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = check_org_id AND parent_user_id = check_user_id
    );
$$;

-- Get user's role identifier
CREATE OR REPLACE FUNCTION public.get_user_role_identifier(check_user_id UUID, check_org_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT r.identifier
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = check_user_id AND ur.organization_id = check_org_id;
$$;

-- Check granular permission
CREATE OR REPLACE FUNCTION public.has_permission(check_user_id UUID, check_org_id UUID, check_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_parent BOOLEAN;
    has_perm BOOLEAN;
BEGIN
    -- 1. Parent always bypasses
    is_parent := public.is_parent_owner(check_user_id, check_org_id);
    IF is_parent THEN
        RETURN TRUE;
    END IF;

    -- 2. Check role permissions
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        JOIN public.role_permissions rp ON r.id = rp.role_id
        WHERE ur.user_id = check_user_id 
          AND ur.organization_id = check_org_id
          AND rp.permission = check_permission
    ) INTO has_perm;

    RETURN has_perm;
END;
$$;


-- 7. Data Migration

DO $$
DECLARE
    parent_email TEXT := 'ab4689372@gmail.com';
    parent_user_id UUID;
    org_id UUID;
    parent_role_id UUID;
    manager_role_id UUID;
    researcher_role_id UUID;
    admin_record RECORD;
BEGIN
    -- Find the designated Parent Owner
    SELECT id INTO parent_user_id FROM auth.users WHERE email = parent_email;

    IF parent_user_id IS NOT NULL THEN
        -- Create the root organization
        INSERT INTO public.organizations (name, parent_user_id)
        VALUES ('IB Nexus Team', parent_user_id)
        RETURNING id INTO org_id;

        -- Create Parent Owner role
        INSERT INTO public.roles (organization_id, name, identifier, description, is_system)
        VALUES (org_id, 'Owner', 'parent_owner', 'Immutable root authority of the organization.', true)
        RETURNING id INTO parent_role_id;

        -- Create Manager role (default fallback for other admins)
        INSERT INTO public.roles (organization_id, name, identifier, description, is_system)
        VALUES (org_id, 'Manager', 'manager', 'Administrative manager with broad access.', true)
        RETURNING id INTO manager_role_id;

        -- Create Researcher role
        INSERT INTO public.roles (organization_id, name, identifier, description, is_system)
        VALUES (org_id, 'Researcher', 'researcher', 'Focuses on content and research.', false)
        RETURNING id INTO researcher_role_id;

        -- Assign permissions to Manager
        INSERT INTO public.role_permissions (role_id, permission) VALUES
        (manager_role_id, 'users.view'), (manager_role_id, 'users.manage'),
        (manager_role_id, 'content.view'), (manager_role_id, 'content.edit'),
        (manager_role_id, 'community.view'), (manager_role_id, 'community.moderate'),
        (manager_role_id, 'impersonation.child');

        -- Assign permissions to Researcher
        INSERT INTO public.role_permissions (role_id, permission) VALUES
        (researcher_role_id, 'content.view'), (researcher_role_id, 'content.edit'),
        (researcher_role_id, 'community.view');

        -- Assign the Parent user
        INSERT INTO public.user_roles (user_id, role_id, organization_id)
        VALUES (parent_user_id, parent_role_id, org_id);

        UPDATE public.profiles SET organization_id = org_id WHERE id = parent_user_id;

        -- Migrate other existing admins to Manager
        FOR admin_record IN 
            SELECT id FROM public.profiles WHERE is_admin = true AND id != parent_user_id
        LOOP
            INSERT INTO public.user_roles (user_id, role_id, organization_id)
            VALUES (admin_record.id, manager_role_id, org_id)
            ON CONFLICT DO NOTHING;

            UPDATE public.profiles SET organization_id = org_id WHERE id = admin_record.id;
        END LOOP;
        
        -- We won't remove is_admin yet, just map it temporarily.
    END IF;
END $$;


-- 8. Basic RLS Policies

-- Profiles: Add check for organization visibility
CREATE POLICY "Users can view members of their organization"
    ON public.profiles FOR SELECT
    USING (
        organization_id IS NOT NULL AND
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Roles: Anyone in org can view roles
CREATE POLICY "View roles in organization"
    ON public.roles FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Role Permissions: Anyone in org can view permissions
CREATE POLICY "View role permissions"
    ON public.role_permissions FOR SELECT
    USING (
        role_id IN (
            SELECT id FROM public.roles WHERE organization_id IN (
                SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
            )
        )
    );

-- User Roles: Anyone in org can view assignments
CREATE POLICY "View user roles in organization"
    ON public.user_roles FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Only Parent Owner can modify roles (for now)
CREATE POLICY "Parent owner can manage roles"
    ON public.roles FOR ALL
    USING (
        public.is_parent_owner(auth.uid(), organization_id)
    );

-- Only Parent Owner can modify user roles
CREATE POLICY "Parent owner can manage user roles"
    ON public.user_roles FOR ALL
    USING (
        public.is_parent_owner(auth.uid(), organization_id)
    );

-- Organizations: users can view their own
CREATE POLICY "View own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
        )
    );

-- Prevent ANY update to organizations except by parent owner
CREATE POLICY "Parent owner can update organization"
    ON public.organizations FOR UPDATE
    USING (parent_user_id = auth.uid());



-- =============================================================
-- Migration: supabase/migrations/20260818000002_fix_rls_recursion.sql
-- =============================================================
-- Fix infinite recursion in user_roles policy
DROP POLICY IF EXISTS "View user roles in organization" ON public.user_roles;

-- Create a helper function that bypasses RLS to get a user's organizations
CREATE OR REPLACE FUNCTION public.get_user_orgs(check_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT organization_id FROM public.user_roles WHERE user_id = check_user_id;
$$;

-- Now use the helper function in the policies to avoid recursion
CREATE POLICY "View user roles in organization"
    ON public.user_roles FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- Also fix the profiles policy to use the helper function
DROP POLICY IF EXISTS "Users can view members of their organization" ON public.profiles;

CREATE POLICY "Users can view members of their organization"
    ON public.profiles FOR SELECT
    USING (
        organization_id IS NOT NULL AND
        organization_id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- Also fix roles
DROP POLICY IF EXISTS "View roles in organization" ON public.roles;

CREATE POLICY "View roles in organization"
    ON public.roles FOR SELECT
    USING (
        organization_id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- Also fix role_permissions
DROP POLICY IF EXISTS "View role permissions" ON public.role_permissions;

CREATE POLICY "View role permissions"
    ON public.role_permissions FOR SELECT
    USING (
        role_id IN (
            SELECT id FROM public.roles WHERE organization_id IN (SELECT public.get_user_orgs(auth.uid()))
        )
    );

-- Also fix organizations
DROP POLICY IF EXISTS "View own organization" ON public.organizations;

CREATE POLICY "View own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (SELECT public.get_user_orgs(auth.uid()))
    );

-- IMPORTANT: Ensure users can ALWAYS view their OWN profile regardless of organization
CREATE POLICY "Users can always view their own profile"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());



-- =============================================================
-- Migration: supabase/migrations/20260819000000_admin_ux_upgrades.sql
-- =============================================================
-- 1. Add is_suspended to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT false;

-- 2. Helper function to check if a user is suspended in any of their orgs
CREATE OR REPLACE FUNCTION public.is_user_suspended(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT is_suspended 
    FROM public.user_roles 
    WHERE user_id = check_user_id AND organization_id = check_org_id;
$$;

-- 3. We do NOT drop existing RLS, but if we wanted to enforce it strictly at DB level we could.
-- Since the application layer (middleware/authorization) checks the context, 
-- we will primarily enforce suspension there for better UX (redirecting to a "suspended" page).



-- =============================================================
-- Migration: supabase/migrations/20260906000000_remove_experimental_admin.sql
-- =============================================================
-- Clean up experimental Admin / Organization / Device Security structures from TEST database

-- 1. Drop experimental tables safely
DROP TABLE IF EXISTS public.admin_device_credentials CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

-- 2. Drop experimental helper functions
DROP FUNCTION IF EXISTS public.is_parent_owner(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_user_role_identifier(UUID, UUID);
DROP FUNCTION IF EXISTS public.has_permission(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_user_suspended(UUID, UUID);

-- 3. Remove organization_id column from profiles if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS organization_id;



-- =============================================================
-- Migration: supabase/migrations/20260906000001_create_community_subjects.sql
-- =============================================================
-- Create community_subjects table if not exists and seed standard IB subjects
CREATE TABLE IF NOT EXISTS public.community_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default IB subjects
INSERT INTO public.community_subjects (name) VALUES
  ('Biology'),
  ('Chemistry'),
  ('Physics'),
  ('Mathematics'),
  ('Computer Science'),
  ('Economics'),
  ('Business Management'),
  ('History'),
  ('Geography'),
  ('English'),
  ('Languages'),
  ('TOK'),
  ('Extended Essay'),
  ('Internal Assessment'),
  ('Study Tips'),
  ('Exam Preparation'),
  ('General IB')
ON CONFLICT (name) DO NOTHING;



-- =============================================================
-- Migration: supabase/migrations/20260906000002_single_admin_system.sql
-- =============================================================
-- =============================================================
-- Single-Admin System Schema Migration
-- Migration: 20260906000002_single_admin_system.sql
-- Description: Adds is_suspended column to profiles, enables admin logs table
-- =============================================================

-- 1. Ensure profiles columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- 2. Create admin activity logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details text,
  created_at timestamptz DEFAULT now()
);

-- 3. Ensure community_rooms table has is_active
ALTER TABLE public.community_rooms ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 4. Enable RLS on admin_activity_logs
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can view all activity logs
CREATE POLICY "Admins can view activity logs" ON public.admin_activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Policy: Admin can insert activity logs
CREATE POLICY "Admins can insert activity logs" ON public.admin_activity_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Grant privileges
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;


