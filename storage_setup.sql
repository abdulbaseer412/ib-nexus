-- IB Nexus Storage Setup for Notes Media

-- 1. Create a new public bucket for notes media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('notes_media', 'notes_media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on the storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anyone to read (view) the media files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'notes_media');

-- 4. Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'notes_media' AND auth.role() = 'authenticated'
);

-- 5. Policy: Allow authenticated users to update their own files (optional)
CREATE POLICY "Users can update their own media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'notes_media' AND auth.uid() = owner
);

-- 6. Policy: Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'notes_media' AND auth.uid() = owner
);
