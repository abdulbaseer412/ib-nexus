-- Create the 'avatars' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the 'avatars' bucket
-- Note: Replace 'avatars' with the exact bucket name you are using.
CREATE POLICY "Avatar images are publicly accessible."
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar."
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
);

CREATE POLICY "Users can update their own avatar."
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own avatar."
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid() = owner
);
