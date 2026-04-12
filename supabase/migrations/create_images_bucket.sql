-- Create a new public bucket for banners and categories if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true) 
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the images bucket
CREATE POLICY "Public read images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'images');

-- Allow authenticated users to upload images (for banners and categories)
CREATE POLICY "Authenticated users can upload images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Allow authenticated users to update/delete images
CREATE POLICY "Authenticated users can update images" 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'images' AND auth.role() = 'authenticated');
