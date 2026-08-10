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
