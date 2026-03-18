const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://tgesidmolbcqaluhphos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(migrationFile) {
    console.log(`Applying migration: ${migrationFile}`);
    
    const sqlPath = path.join(__dirname, 'migrations', migrationFile);
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('SQL content length:', sql.length);
    console.log('First 200 chars:', sql.substring(0, 200));
    
    // Try to execute via RPC if available
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('RPC Error:', error.message);
        console.log('\n⚠️  RPC function "exec_sql" not available in your Supabase instance.');
        console.log('\nPlease apply this migration manually:');
        console.log('1. Go to https://tgesidmolbcqaluhphos.supabase.co');
        console.log('2. Open SQL Editor');
        console.log('3. Paste the content from:', sqlPath);
        console.log('4. Run the SQL');
    } else {
        console.log('✅ Migration applied successfully!');
        console.log('Result:', data);
    }
}

// Apply the specific migration
applyMigration('fix_chat_storage_policies.sql');
