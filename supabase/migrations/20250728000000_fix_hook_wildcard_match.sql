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
