const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://tgesidmolbcqaluhphos.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s'
);

async function check() {
    const { data, error } = await supabase.from('categories').select('*').limit(1);
    console.log('Data:', data);
    console.log('Error:', error);
}

check();
