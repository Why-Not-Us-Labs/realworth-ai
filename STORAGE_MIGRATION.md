# Image Storage Migration Guide

## Overview

This guide covers migrating from base64 image storage in the database to Supabase Storage, which will:
- ✅ Reduce database size by ~90%
- ✅ Lower bandwidth costs significantly
- ✅ Improve loading performance
- ✅ Resolve resource exhaustion issues

## Prerequisites

- Supabase project with admin access
- Node.js environment configured
- `.env.local` file with Supabase credentials

## Step 1: Create Storage Bucket

Run this SQL in your Supabase SQL Editor:

```sql
-- Location: supabase/setup_storage.sql

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
```

## Step 2: Migrate Existing Images

This step moves existing base64 images from the database to Supabase Storage.

### Run Migration Script

```bash
node scripts/migrate-images-to-storage.js
```

**What it does:**
1. Fetches all appraisals with base64 images
2. Uploads each image to Supabase Storage
3. Updates database records with storage URLs
4. Provides migration summary

**Expected output:**
```
🚀 Starting image migration to Supabase Storage...

📥 Fetching appraisals from database...
   Found 15 appraisals with base64 images

[1/15] Processing appraisal abc-123...
   ✅ Migrated successfully
...

📊 Migration Summary:
   ✅ Successfully migrated: 15
   ❌ Errors: 0
   📦 Total processed: 15

💾 Estimated database space saved: ~7.32 MB

✨ Migration complete!
```

## Step 3: Deploy Code Changes

The code has been updated to use Supabase Storage for new appraisals:

### Changes Made:

**1. API Route (`app/api/appraise/route.ts`)**
- Now uploads regenerated images to Supabase Storage
- Returns storage URL instead of base64 data
- Significantly reduces response size

**2. Database**
- `image_url` column now stores URLs (text) instead of base64 (massive text)
- Typical reduction: ~500KB → ~100 bytes per appraisal

### Deploy to Production

```bash
git add .
git commit -m "Migrate images to Supabase Storage"
git push origin main
```

Vercel will auto-deploy the changes.

## Step 4: Verify Migration

### Test New Appraisals
1. Go to https://realworth.ai
2. Sign in with Google
3. Create a new appraisal
4. Check the database - `image_url` should be a URL like:
   `https://gwoahdeybyjfonoahmvv.supabase.co/storage/v1/object/public/appraisal-images/public/123456-abc.png`

### Check Storage Usage

In Supabase Dashboard:
1. Go to **Storage** → **appraisal-images**
2. Verify images are uploading correctly
3. Check **Settings** → **Usage** to see storage metrics

## Benefits

### Before Migration (Base64 in Database)
- Database row size: ~500KB per appraisal
- 100 appraisals = ~50MB database size
- Every history load transfers all images
- Hits database size and bandwidth limits quickly

### After Migration (URLs in Database)
- Database row size: ~1KB per appraisal (99% reduction!)
- 100 appraisals = ~100KB database size
- Images loaded individually as needed
- CDN-backed, cached, fast delivery

### Cost Savings

**Database Size:**
- Before: 50MB for 100 appraisals
- After: 100KB for 100 appraisals
- **Savings: 99.8%**

**Bandwidth:**
- Before: ~5MB per page load (loading all history)
- After: ~50KB per page load (URLs only)
- **Savings: 99%**

## Troubleshooting

### Migration Script Fails

**Error: "Failed to fetch appraisals"**
- Check Supabase connection
- Verify `.env.local` has correct credentials

**Error: "Upload failed: Bucket not found"**
- Run the storage bucket setup SQL first (Step 1)

**Error: "Database update failed"**
- Check RLS policies allow updates
- Verify user permissions

### Images Not Loading

**Check bucket is public:**
```sql
SELECT * FROM storage.buckets WHERE id = 'appraisal-images';
-- public column should be TRUE
```

**Check storage policies:**
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'appraisal-images';
-- Should see 4 policies
```

### Rollback (if needed)

If you need to rollback:
1. The old base64 data is still in backups
2. You can restore from a Supabase backup
3. Revert the code changes via git

## Maintenance

### Cleaning Up Old Images

Once migration is verified, you can delete orphaned images:

```javascript
// Future cleanup script
// Delete storage images that don't have corresponding database records
```

### Monitoring

Track storage usage:
- Supabase Dashboard → **Settings** → **Usage**
- Set up alerts for storage quotas
- Monitor bandwidth usage

## Next Steps

With images migrated to storage, consider:

1. **Add compression**: Compress images before upload
2. **Add thumbnails**: Generate smaller versions for history list
3. **Add CDN caching**: Configure longer cache times
4. **User-specific folders**: Organize by user ID (already in migration script)

## Support

Questions? Check:
- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- Project documentation: `/CLAUDE.md`
