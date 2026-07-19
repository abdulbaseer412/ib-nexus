-- Enforce one profile per auth user (already via PK) and prevent duplicate profile emails.
-- Email uniqueness is scoped to non-null values; auth.users remains the source of truth for login.

create unique index if not exists profiles_email_unique
  on public.profiles (lower(email))
  where email is not null;

-- Future profile fields can live in preferences jsonb without schema changes.
comment on column public.profiles.preferences is
  'Extensible key-value store for country, school, grade, subjects, achievements, XP, badges, notification settings, university goals, career interests, etc.';
