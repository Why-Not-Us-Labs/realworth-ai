/**
 * Check Supabase connection health and diagnostics
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkHealth() {
  console.log('🔍 Checking Supabase Health...\n');

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Basic connection
  console.log('1️⃣ Testing basic connection...');
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log(`   ❌ Database query failed: ${error.message}`);
    } else {
      console.log('   ✅ Database connection working');
    }
  } catch (e) {
    console.log(`   ❌ Connection error: ${e.message}`);
  }

  // Test 2: Storage buckets
  console.log('\n2️⃣ Checking storage buckets...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log(`   ❌ Storage API failed: ${error.message}`);
    } else {
      console.log(`   ✅ Found ${buckets?.length || 0} storage buckets`);
      if (buckets && buckets.length > 0) {
        buckets.forEach(b => console.log(`      - ${b.id} (public: ${b.public})`));
      }

      // Check if appraisal-images exists
      const hasAppraisalBucket = buckets?.find(b => b.id === 'appraisal-images');
      if (hasAppraisalBucket) {
        console.log('\n   🎉 appraisal-images bucket EXISTS!');
      } else {
        console.log('\n   ⚠️  appraisal-images bucket NOT FOUND');
      }
    }
  } catch (e) {
    console.log(`   ❌ Storage check error: ${e.message}`);
  }

  // Test 3: Auth status
  console.log('\n3️⃣ Checking auth service...');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('   ✅ Auth service responding');
  } catch (e) {
    console.log(`   ❌ Auth error: ${e.message}`);
  }

  // Test 4: Project info
  console.log('\n4️⃣ Project Configuration:');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Project ID: ${supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]}`);

  console.log('\n✨ Health check complete!');
}

checkHealth();
