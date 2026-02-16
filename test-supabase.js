const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

async function testSupabase() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    console.log('\n1. Testing basic query (categories)...');
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(3);

    if (catError) {
      console.error('Categories error:', catError);
    } else {
      console.log('Categories OK:', categories?.length, 'rows');
    }

    console.log('\n2. Testing ads query...');
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .limit(3);

    if (adsError) {
      console.error('Ads error:', adsError);
    } else {
      console.log('Ads OK:', ads?.length, 'rows');
    }

    console.log('\n3. Testing banners query...');
    const { data: banners, error: bannersError } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .limit(3);

    if (bannersError) {
      console.error('Banners error:', bannersError);
    } else {
      console.log('Banners OK:', banners?.length, 'rows');
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testSupabase();
