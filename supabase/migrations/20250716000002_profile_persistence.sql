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
