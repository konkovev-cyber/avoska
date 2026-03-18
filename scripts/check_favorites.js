const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tgesidmolbcqaluhphos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: session } = await supabase.auth.getSession();
    console.log('Session user:', session?.user?.id || 'No session');

    const { data: favs, error } = await supabase
        .from('favorites')
        .select('*, adsCount:ads(count)');

    if (error) console.error('Error fetching favorites:', error.message);
    else {
        console.log('Total favorites in DB:', favs.length);
        console.log('Sample favorites:', JSON.stringify(favs.slice(0, 3), null, 2));
    }
}

check();
