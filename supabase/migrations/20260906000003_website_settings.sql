-- Migration: Website Settings (Global Website Lock/Unlock Control)

CREATE TABLE IF NOT EXISTS website_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  lock_message TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT NULL
);

INSERT INTO website_settings (id, is_locked, lock_message, updated_at, updated_by)
VALUES ('global', false, NULL, NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to website_settings" ON website_settings;
CREATE POLICY "Allow public read access to website_settings"
  ON website_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access to website_settings" ON website_settings;
CREATE POLICY "Allow admin full access to website_settings"
  ON website_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
