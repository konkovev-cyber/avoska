const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tgesidmolbcqaluhphos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s';
// Note: Usually service role key is needed for inserts if RLS is strict, but let's try anon first if permitted, 
// or I'll ask for the service key if it fails. Actually, I should check if I can find the service key.
// But wait, categories might be public insertable for admin? Probably not.
// Let's check the schema again.

const supabase = createClient(supabaseUrl, supabaseKey);

const newCategories = [
    { name: 'Аренда квартир', slug: 'rent-apartments' },
    { name: 'Аренда коммерции', slug: 'rent-commercial' },
    { name: 'Аренда авто', slug: 'rent-cars' },
    { name: 'Аренда инструмента', slug: 'rent-tools' }
];

async function seed() {
    for (const cat of newCategories) {
        const { data, error } = await supabase
            .from('categories')
            .upsert(cat, { onConflict: 'slug' });

        if (error) console.error(`Error inserting ${cat.slug}:`, error.message);
        else console.log(`Successfully upserted ${cat.slug}`);
    }
}

seed();
