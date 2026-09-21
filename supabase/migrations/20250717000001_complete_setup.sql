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
