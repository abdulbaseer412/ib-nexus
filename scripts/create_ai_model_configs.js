const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const ref = 'zdzeajqqxecyvvfrizmp';

const poolers = [
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-sa-east-1.pooler.supabase.com",
  "aws-0-ap-south-1.pooler.supabase.com",
  "aws-0-us-east-2.pooler.supabase.com",
  "aws-0-us-west-2.pooler.supabase.com",
  "aws-0-eu-west-1.pooler.supabase.com",
  "aws-0-eu-west-2.pooler.supabase.com",
  "aws-0-ap-southeast-2.pooler.supabase.com",
  "aws-0-ap-northeast-1.pooler.supabase.com"
];

const passwords = ["abdulbaseer412"];
const users = [`postgres.${ref}`, "postgres"];

const sql = `
CREATE TABLE IF NOT EXISTS public.ai_model_configs (
  model_id TEXT PRIMARY KEY,
  display_name TEXT,
  description TEXT,
  provider TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  allowed_roles TEXT DEFAULT 'all',
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC DEFAULT 0.7,
  fallback_model_id TEXT DEFAULT 'gemini-3.6-flash',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read access to ai_model_configs' AND tablename = 'ai_model_configs') THEN
    CREATE POLICY "Allow public read access to ai_model_configs" ON public.ai_model_configs FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage ai_model_configs' AND tablename = 'ai_model_configs') THEN
    CREATE POLICY "Admins can manage ai_model_configs" ON public.ai_model_configs FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      )
    );
  END IF;
END $$;
`;

async function run() {
  for (const host of poolers) {
    for (const user of users) {
      for (const pass of passwords) {
        for (const port of [6543, 5432]) {
          const client = new Client({
            host,
            port,
            user,
            password: pass,
            database: "postgres",
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 3000
          });

          try {
            await client.connect();
            console.log(`🎉 Connected to ${host}:${port} as ${user}!`);
            await client.query(sql);
            console.log("✅ ai_model_configs migration executed successfully!");
            await client.end();
            return;
          } catch (err) {
            try { await client.end(); } catch (e) {}
          }
        }
      }
    }
  }

  console.log("Could not connect via pooler.");
}

run();
