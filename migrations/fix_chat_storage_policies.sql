-- Migration: Secure chat image storage policies
-- This script fixes a vulnerability where any authenticated user could upload files
-- to any other user's folder in the 'chat-images' bucket.

-- 1. Drop the old, insecure policies
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view chat images" ON storage.objects; -- Recreate with more specificity

-- 2. Create a secure INSERT policy
-- This policy ensures that a user can only upload to a folder that matches their own UID.
CREATE POLICY "Authenticated users can upload to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Create a secure DELETE policy
-- This policy allows users to delete their own files from their own folder.
CREATE POLICY "Authenticated users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Recreate the SELECT policy (no change in logic, just for clarity and completeness)
-- This policy allows anyone to view any image in the chat-images bucket.
-- This is a design choice. For higher privacy, signed URLs would be needed.
CREATE POLICY "Public can view chat images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-images' );

-- Verify policies are created
SELECT
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';
