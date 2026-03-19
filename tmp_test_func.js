const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple parser for .env.local
const envVars = {};
try {
  const envContent = fs.readFileSync('d:/!AiSite/avoska/avoska/.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (e) {
  console.error('Failed to read .env.local', e.message);
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFunction() {
  console.log('Testing notify-test function...');
  console.log('URL:', supabaseUrl);

  const chatId = '-1003221253810';

  try {
    const { data, error } = await supabase.functions.invoke('notify-test', {
      body: { chatId }
    });

    if (error) {
      console.error('❌ Function error (Edge Function probably NOT deployed or CORS issue):', error);
    } else {
      console.log('✅ Function response:', data);
    }
  } catch (e) {
    console.error('❌ Caught error during fetch:', e.message);
  }
}

testFunction();
