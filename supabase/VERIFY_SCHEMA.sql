-- Verification Script for RealWorth.ai Database Schema
-- Run this to verify all required columns exist
-- This helps ensure scan queue and all features work correctly

-- Check appraisals table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appraisals'
ORDER BY ordinal_position;

-- Check users table columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Verify required columns exist
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check appraisals table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appraisals' 
        AND column_name = 'image_urls'
    ) THEN
        missing_columns := array_append(missing_columns, 'appraisals.image_urls');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appraisals' 
        AND column_name = 'references'
    ) THEN
        missing_columns := array_append(missing_columns, 'appraisals.references');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'appraisals' 
        AND column_name = 'is_public'
    ) THEN
        missing_columns := array_append(missing_columns, 'appraisals.is_public');
    END IF;

    -- Check users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        missing_columns := array_append(missing_columns, 'users.username');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'current_streak'
    ) THEN
        missing_columns := array_append(missing_columns, 'users.current_streak');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'longest_streak'
    ) THEN
        missing_columns := array_append(missing_columns, 'users.longest_streak');
    END IF;

    -- Report results
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE 'Missing columns detected. Run migration_complete_schema.sql to add them.', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'All required columns exist! Schema is complete.';
    END IF;
END $$;

-- Verify storage bucket exists
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'appraisal-images';

-- Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'appraisals')
ORDER BY tablename, policyname;

