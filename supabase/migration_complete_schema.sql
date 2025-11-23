-- Complete Schema Migration for RealWorth.ai
-- Run this in Supabase SQL Editor to ensure all columns exist
-- This ensures compatibility with scan queue and all features

-- Add missing columns to appraisals table if they don't exist

-- Add image_urls column (array of image URLs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appraisals' 
    AND column_name = 'image_urls'
  ) THEN
    ALTER TABLE public.appraisals 
    ADD COLUMN image_urls TEXT[];
  END IF;
END $$;

-- Add references column (JSONB for reference objects)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appraisals' 
    AND column_name = 'references'
  ) THEN
    ALTER TABLE public.appraisals 
    ADD COLUMN references JSONB;
  END IF;
END $$;

-- Add is_public column (boolean for public sharing)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appraisals' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.appraisals 
    ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add username column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Add streak columns to users table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'current_streak'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN current_streak INTEGER DEFAULT 0;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'longest_streak'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN longest_streak INTEGER DEFAULT 0;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appraisals_references 
ON public.appraisals USING GIN (references)
WHERE references IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appraisals_is_public 
ON public.appraisals(is_public)
WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_users_username 
ON public.users(username)
WHERE username IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.appraisals.image_urls IS 'Array of all image URLs (uploads + result image)';
COMMENT ON COLUMN public.appraisals.references IS 'Array of reference sources with title and URL fields that support the price valuation';
COMMENT ON COLUMN public.appraisals.is_public IS 'Whether this appraisal is publicly shareable';
COMMENT ON COLUMN public.users.username IS 'Unique username for user identification';
COMMENT ON COLUMN public.users.current_streak IS 'Current consecutive days with appraisals';
COMMENT ON COLUMN public.users.longest_streak IS 'Longest consecutive days streak achieved';

-- Ensure RLS policies allow reading public appraisals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'appraisals' 
    AND policyname = 'Public can view public appraisals'
  ) THEN
    CREATE POLICY "Public can view public appraisals"
    ON public.appraisals
    FOR SELECT
    USING (is_public = true);
  END IF;
END $$;

-- Update existing appraisals to have default values
UPDATE public.appraisals 
SET image_urls = ARRAY[image_url]::TEXT[]
WHERE image_urls IS NULL AND image_url IS NOT NULL;

UPDATE public.appraisals 
SET is_public = false
WHERE is_public IS NULL;

UPDATE public.appraisals 
SET references = '[]'::JSONB
WHERE references IS NULL;

