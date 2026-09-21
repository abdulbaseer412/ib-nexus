const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

client.connect().then(() => {
  const sql = `
    ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Ready';
    ALTER TABLE public.ai_knowledge_items ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL;

    CREATE TABLE IF NOT EXISTS public.ai_training_queue (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      source_type TEXT NOT NULL DEFAULT 'manual',
      original_question TEXT,
      original_answer TEXT,
      suggested_improvement TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.ai_instructions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      is_active BOOLEAN DEFAULT true,
      updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS public.ai_evaluations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      dataset_name TEXT NOT NULL,
      run_status TEXT DEFAULT 'pending',
      results JSONB DEFAULT '{}',
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_ai_training_queue_status ON public.ai_training_queue(status);

    ALTER TABLE public.ai_training_queue ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_instructions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.ai_evaluations ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage training queue' AND tablename = 'ai_training_queue') THEN
        CREATE POLICY "Admin can manage training queue" ON public.ai_training_queue FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage instructions' AND tablename = 'ai_instructions') THEN
        CREATE POLICY "Admin can manage instructions" ON public.ai_instructions FOR ALL USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage evaluations' AND tablename = 'ai_evaluations') THEN
        CREATE POLICY "Admin can manage evaluations" ON public.ai_evaluations FOR ALL USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;
  return client.query(sql);
}).then(() => {
  console.log('DB Updated');
  process.exit(0);
}).catch(console.error);
