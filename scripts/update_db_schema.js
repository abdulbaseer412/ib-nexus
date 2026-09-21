const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^DATABASE_URL=(.*)$/);
    if (match) {
      databaseUrl = match[1].trim().replace(/^["']|["']$/g, '');
    }
  }
}

if (!databaseUrl) {
  console.error("No DATABASE_URL found");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function run() {
  console.log("Connecting to Postgres...");
  await client.connect();

  const sql = `
    -- 1. Ensure ai_training_entries has all required columns
    CREATE TABLE IF NOT EXISTS public.ai_training_entries (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      sequence_num SERIAL,
      original_prompt TEXT NOT NULL,
      ai_instruction TEXT,
      ai_analysis JSONB DEFAULT '{}'::jsonb,
      ai_interpretation TEXT,
      category TEXT DEFAULT 'Uncategorized',
      priority TEXT DEFAULT 'Normal',
      scope TEXT DEFAULT 'Global',
      status TEXT DEFAULT 'Pending Review',
      superseded_by UUID REFERENCES public.ai_training_entries(id) ON DELETE SET NULL,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.ai_training_entries ADD COLUMN IF NOT EXISTS ai_instruction TEXT;
    ALTER TABLE public.ai_training_entries ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.ai_training_entries ADD COLUMN IF NOT EXISTS superseded_by UUID REFERENCES public.ai_training_entries(id) ON DELETE SET NULL;

    -- 2. AI Master Versions
    CREATE TABLE IF NOT EXISTS public.ai_master_versions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      version_num SERIAL,
      is_active BOOLEAN DEFAULT false,
      published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      published_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- 3. AI Master Rules
    CREATE TABLE IF NOT EXISTS public.ai_master_rules (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      version_id UUID NOT NULL REFERENCES public.ai_master_versions(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      rule_text TEXT NOT NULL,
      derived_from JSONB DEFAULT '[]'::jsonb,
      training_entry_id UUID REFERENCES public.ai_training_entries(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.ai_master_rules ADD COLUMN IF NOT EXISTS training_entry_id UUID REFERENCES public.ai_training_entries(id) ON DELETE SET NULL;

    -- 4. Training Relationships
    CREATE TABLE IF NOT EXISTS public.ai_training_relationships (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      source_entry_id UUID NOT NULL REFERENCES public.ai_training_entries(id) ON DELETE CASCADE,
      target_entry_id UUID REFERENCES public.ai_training_entries(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      explanation TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
  `;

  await client.query(sql);
  console.log("Database Migration via PG Succeeded!");
  await client.end();
}

run().catch((err) => {
  console.error("PG Error:", err);
  process.exit(1);
});
