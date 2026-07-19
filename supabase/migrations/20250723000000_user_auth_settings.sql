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
