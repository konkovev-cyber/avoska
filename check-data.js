const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://tgesidmolbcqaluhphos.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s'
);

async function checkData() {
  console.log('=== Проверка данных в Supabase ===\n');
  
  // Категории
  const { data: categories } = await supabase.from('categories').select('*');
  console.log('Категории:', categories?.length || 0);
  if (categories?.length > 0) {
    console.log('  -', categories.slice(0, 3).map(c => c.name).join(', '));
  }
  
  // Объявления
  const { data: ads } = await supabase.from('ads').select('*').eq('status', 'active');
  console.log('\nАктивные объявления:', ads?.length || 0);
  
  // Баннеры
  const { data: banners } = await supabase.from('banners').select('*').eq('is_active', true);
  console.log('Активные баннеры:', banners?.length || 0);
  
  // Настройки
  const { data: settings } = await supabase.from('app_settings').select('*');
  console.log('Настройки:', settings?.length || 0);
  
  console.log('\n✅ Проверка завершена');
}

checkData();
