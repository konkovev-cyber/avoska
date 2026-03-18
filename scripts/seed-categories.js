const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://tgesidmolbcqaluhphos.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s'
);

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=400&auto=format&fit=crop', color: 'from-orange-400 to-red-500' },
    { name: 'Недвижимость', slug: 'real-estate', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop', color: 'from-blue-400 to-blue-600' },
    { name: 'Работа', slug: 'jobs', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=400&auto=format&fit=crop', color: 'from-red-400 to-red-600' },
    { name: 'Услуги', slug: 'services', image: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=400&auto=format&fit=crop', color: 'from-purple-400 to-purple-600' },
    { name: 'Электроника', slug: 'electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=400&auto=format&fit=crop', color: 'from-green-400 to-green-600' },
    { name: 'Дом и дача', slug: 'home', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop', color: 'from-yellow-400 to-orange-500' },
    { name: 'Личные вещи', slug: 'clothing', image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop', color: 'from-blue-300 to-blue-500' },
    { name: 'Запчасти', slug: 'parts', image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop', color: 'from-gray-400 to-gray-600' },
    { name: 'Хобби', slug: 'hobby', image: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?q=80&w=400&auto=format&fit=crop', color: 'from-pink-400 to-rose-500' },
    { name: 'Животные', slug: 'pets', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop', color: 'from-yellow-300 to-yellow-500' },
    { name: 'Красота', slug: 'beauty', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?q=80&w=400&auto=format&fit=crop', color: 'from-pink-300 to-pink-500' },
    { name: 'Детское', slug: 'kids', image: 'https://images.unsplash.com/photo-1515488442805-d37197004f1e?q=80&w=400&auto=format&fit=crop', color: 'from-cyan-300 to-blue-400' },
];

async function seed() {
    console.log('Seeding categories...');
    for (const cat of CATEGORIES) {
        const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'slug' });
        if (error) console.error(`Error seeding ${cat.name}:`, error.message);
        else console.log(`Seeded ${cat.name}`);
    }
    console.log('Done.');
}

seed();
