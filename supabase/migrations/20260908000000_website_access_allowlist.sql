-- 1. Create website_access_allowlist table if it does not exist
CREATE TABLE IF NOT EXISTS public.website_access_allowlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Safely add normalized_email column if missing
ALTER TABLE public.website_access_allowlist 
ADD COLUMN IF NOT EXISTS normalized_email TEXT;

-- 3. Populate normalized_email for any existing records
UPDATE public.website_access_allowlist 
SET normalized_email = LOWER(TRIM(email)) 
WHERE normalized_email IS NULL OR normalized_email = '';

-- 4. Set normalized_email NOT NULL constraint safely
ALTER TABLE public.website_access_allowlist 
ALTER COLUMN normalized_email SET NOT NULL;

-- 5. Add unique constraint on (provider, normalized_email) if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'website_access_allowlist_provider_normalized_email_key'
  ) THEN
    ALTER TABLE public.website_access_allowlist 
    ADD CONSTRAINT website_access_allowlist_provider_normalized_email_key 
    UNIQUE (provider, normalized_email);
  END IF;
END $$;

-- 6. Performance Index for fast lookup in middleware
CREATE INDEX IF NOT EXISTS idx_website_access_allowlist_lookup 
ON public.website_access_allowlist (provider, normalized_email, active);

-- 7. Add updated_at trigger
CREATE OR REPLACE FUNCTION update_website_access_allowlist_modtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_website_access_allowlist_modtime ON public.website_access_allowlist;
CREATE TRIGGER update_website_access_allowlist_modtime
BEFORE UPDATE ON public.website_access_allowlist
FOR EACH ROW
EXECUTE FUNCTION update_website_access_allowlist_modtime();

-- 8. Enable RLS
ALTER TABLE public.website_access_allowlist ENABLE ROW LEVEL SECURITY;

-- 9. Admins RLS Policy
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage allowlist' AND tablename = 'website_access_allowlist') THEN
    CREATE POLICY "Admins can manage allowlist" 
    ON public.website_access_allowlist 
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


