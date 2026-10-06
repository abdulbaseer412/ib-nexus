CREATE TABLE IF NOT EXISTS admin_device_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL,
  transports TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_device_user ON admin_device_credentials(user_id);
ALTER TABLE admin_device_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own device credentials" 
  ON admin_device_credentials FOR SELECT 
  USING (auth.uid() = user_id);
