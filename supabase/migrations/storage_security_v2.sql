-- Update storage policies for 'images' bucket to be more secure
-- 1. Restrict insertions to only the owner's folder
-- 2. Restrict deletions to only the owner
-- 3. Maintain public read (as required for ad display) but could be limited to specific folders if needed

-- First, drop existing policies for 'images' bucket to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Public read images" ON storage.objects;

-- Re-enable public read (for the whole bucket if it's meant to be a CDN-like bucket)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Restrict uploads: User can only upload to 'images/{user_id}/*' folder
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Restrict updates: User can only update their own images
CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
WITH CHECK (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Restrict deletions: User can only delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'images' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional: Create a private 'chat_attachments' bucket for better privacy
-- This would require signed URLs in the frontend
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for private 'attachments' bucket (owner and admin only)
CREATE POLICY "Owners can see their own attachments"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'attachments' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
