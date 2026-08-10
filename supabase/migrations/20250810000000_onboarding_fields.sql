alter table public.profiles
  add column if not exists exam_session text,
  add column if not exists subjects jsonb default '[]'::jsonb,
  add column if not exists study_goals jsonb default '[]'::jsonb;
