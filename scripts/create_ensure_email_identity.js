const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zdzeajqqxecyvvfrizmp:abdulbaseer412@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  await client.query(`
    CREATE OR REPLACE FUNCTION public.ensure_email_identity(p_user_id uuid, p_email text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth
    AS $$
    BEGIN
      -- 1. Insert into auth.identities if not already present
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        p_user_id,
        jsonb_build_object('sub', p_user_id::text, 'email', lower(trim(p_email)), 'email_verified', true),
        'email',
        p_user_id::text,
        now(),
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.identities WHERE user_id = p_user_id AND provider = 'email'
      );

      -- 2. Update raw_app_meta_data to include 'email' in providers
      UPDATE auth.users
      SET raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{providers}',
        (
          SELECT jsonb_agg(DISTINCT p)
          FROM (
            SELECT jsonb_array_elements_text(COALESCE(raw_app_meta_data->'providers', '[]'::jsonb)) as p
            UNION SELECT 'email'
          ) s
        )
      )
      WHERE id = p_user_id;

      -- 3. Upsert user_auth_settings row
      INSERT INTO public.user_auth_settings (user_id, email_password_enabled, updated_at)
      VALUES (p_user_id, true, now())
      ON CONFLICT (user_id) DO UPDATE
      SET email_password_enabled = true, updated_at = now();
    END;
    $$;
  `);

  console.log("ensure_email_identity function created successfully!");
  await client.end();
}

run().catch(console.error);
