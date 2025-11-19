-- Supabase Storage Setup for Appraisal Images
-- Run this in Supabase SQL Editor

-- Create storage bucket for appraisal images
INSERT INTO storage.buckets (id, name, public)
VALUES ('appraisal-images', 'appraisal-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'appraisal-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own images
CREATE POLICY "Users can read own images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'appraisal-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access (for sharing appraisals in the future)
CREATE POLICY "Public can read images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'appraisal-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'appraisal-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
