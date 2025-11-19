/**
 * Migration Script: Move existing base64 images from database to Supabase Storage
 *
 * This script:
 * 1. Fetches all appraisals with base64 images from the database
 * 2. Uploads each image to Supabase Storage
 * 3. Updates the database records with storage URLs
 * 4. Optionally deletes the old base64 data to free up space
 *
 * Run with: node scripts/migrate-images-to-storage.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateImages() {
  console.log('🚀 Starting image migration to Supabase Storage...\n');

  try {
    // Step 1: Fetch all appraisals with base64 images
    console.log('📥 Fetching appraisals from database...');
    const { data: appraisals, error: fetchError } = await supabase
      .from('appraisals')
      .select('id, image_url, user_id')
      .like('image_url', 'data:%');  // Only get base64 images

    if (fetchError) {
      throw new Error(`Failed to fetch appraisals: ${fetchError.message}`);
    }

    if (!appraisals || appraisals.length === 0) {
      console.log('✅ No base64 images found. Migration not needed!');
      return;
    }

    console.log(`   Found ${appraisals.length} appraisals with base64 images\n`);

    let successCount = 0;
    let errorCount = 0;

    // Step 2: Process each appraisal
    for (let i = 0; i < appraisals.length; i++) {
      const appraisal = appraisals[i];
      console.log(`[${i + 1}/${appraisals.length}] Processing appraisal ${appraisal.id}...`);

      try {
        // Extract base64 data
        const base64Match = appraisal.image_url.match(/^data:([^;]+);base64,(.+)$/);
        if (!base64Match) {
          console.log(`   ⚠️  Invalid base64 format, skipping`);
          errorCount++;
          continue;
        }

        const mimeType = base64Match[1];
        const base64Data = base64Match[2];
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Generate filename
        const fileExt = mimeType.split('/')[1] || 'png';
        const fileName = `${appraisal.user_id}/${appraisal.id}.${fileExt}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('appraisal-images')
          .upload(fileName, imageBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true  // Overwrite if exists
          });

        if (uploadError) {
          console.log(`   ❌ Upload failed: ${uploadError.message}`);
          errorCount++;
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('appraisal-images')
          .getPublicUrl(fileName);

        // Update database record
        const { error: updateError } = await supabase
          .from('appraisals')
          .update({ image_url: publicUrl })
          .eq('id', appraisal.id);

        if (updateError) {
          console.log(`   ❌ Database update failed: ${updateError.message}`);
          errorCount++;
          continue;
        }

        console.log(`   ✅ Migrated successfully`);
        successCount++;

      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
        errorCount++;
      }
    }

    // Step 3: Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📦 Total processed: ${appraisals.length}`);

    if (successCount > 0) {
      const savedMB = (successCount * 500) / 1024; // Rough estimate: 500KB per image
      console.log(`\n💾 Estimated database space saved: ~${savedMB.toFixed(2)} MB`);
    }

    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateImages();
