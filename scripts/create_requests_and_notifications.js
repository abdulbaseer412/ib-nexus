const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zdzeajqqxecyvvfrizmp:abdulbaseer412@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log("Creating admin_requests and user_notifications tables...");

  await client.query(`
    -- 1. admin_requests table
    CREATE TABLE IF NOT EXISTS public.admin_requests (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      user_email text,
      user_name text,
      request_type text NOT NULL,
      title text NOT NULL,
      details text,
      metadata jsonb DEFAULT '{}'::jsonb,
      target_id text,
      target_table text,
      status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'resolved')),
      admin_response text,
      reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
      reviewed_at timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_admin_requests_status ON public.admin_requests(status);
    CREATE INDEX IF NOT EXISTS idx_admin_requests_user ON public.admin_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_admin_requests_type ON public.admin_requests(request_type);
    CREATE INDEX IF NOT EXISTS idx_admin_requests_created ON public.admin_requests(created_at DESC);

    -- 2. user_notifications table
    CREATE TABLE IF NOT EXISTS public.user_notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      request_id uuid REFERENCES public.admin_requests(id) ON DELETE CASCADE,
      title text NOT NULL,
      message text NOT NULL,
      type text DEFAULT 'info' CHECK (type IN ('success', 'warning', 'info', 'error', 'approved', 'rejected', 'resolved')),
      request_type text,
      target_url text,
      is_read boolean DEFAULT false,
      is_popup_dismissed boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON public.user_notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_dismissed ON public.user_notifications(is_popup_dismissed);
    CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON public.user_notifications(created_at DESC);

    -- Enable RLS
    ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

    -- Policies for admin_requests
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own requests' AND tablename = 'admin_requests') THEN
        CREATE POLICY "Users can view their own requests" ON public.admin_requests
          FOR SELECT USING (auth.uid() = user_id);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all requests' AND tablename = 'admin_requests') THEN
        CREATE POLICY "Admins can manage all requests" ON public.admin_requests
          FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
          );
      END IF;

      -- Policies for user_notifications
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own notifications' AND tablename = 'user_notifications') THEN
        CREATE POLICY "Users can manage their own notifications" ON public.user_notifications
          FOR ALL USING (auth.uid() = user_id);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can insert user notifications' AND tablename = 'user_notifications') THEN
        CREATE POLICY "Admins can insert user notifications" ON public.user_notifications
          FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
          );
      END IF;
    END $$;
  `);

  console.log("admin_requests and user_notifications created successfully!");
  await client.end();
}

run().catch(console.error);
