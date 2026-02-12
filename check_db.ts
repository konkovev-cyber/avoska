import { supabase } from './src/lib/supabase/client';

async function checkTable() {
    const { data, error } = await supabase.from('reviews').select('*').limit(1);
    if (error) {
        console.log('Error fetching reviews:', error.message);
    } else {
        console.log('Reviews table exists, found:', data.length, 'rows');
    }
}

checkTable();
