-- Migration to add school_name and referral_source to profiles table

alter table public.profiles
  add column if not exists school_name text,
  add column if not exists referral_source text;
