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
