const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const connectionString = env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  console.log("=== CREATING ADMIN_ACTIVITY_LOGS TABLE ===");
  await client.connect();

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      actor_email TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at 
    ON public.admin_activity_logs (created_at DESC);

    ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage admin activity logs' AND tablename = 'admin_activity_logs') THEN
        CREATE POLICY "Admins can manage admin activity logs" 
        ON public.admin_activity_logs 
        FOR ALL 
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
          )
        ) 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
          )
        );
      END IF;
    END $$;
  `;

  await client.query(createTableSql);
  console.log("✅ admin_activity_logs table created successfully!");

  const { rows } = await client.query("SELECT COUNT(*) FROM public.admin_activity_logs;");
  console.log("admin_activity_logs row count:", rows[0].count);

  await client.end();
}

main().catch(err => {
  console.error("Error executing SQL:", err);
  process.exit(1);
});
