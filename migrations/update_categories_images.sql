-- Обновление категорий с красивыми изображениями
-- Выполните этот скрипт в Supabase SQL Editor

UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=400&auto=format&fit=crop', color = 'from-orange-400 to-red-500' WHERE slug = 'transport';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop', color = 'from-blue-400 to-blue-600' WHERE slug = 'real-estate';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=400&auto=format&fit=crop', color = 'from-red-400 to-red-600' WHERE slug = 'jobs';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=400&auto=format&fit=crop', color = 'from-purple-400 to-purple-600' WHERE slug = 'services';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=400&auto=format&fit=crop', color = 'from-green-400 to-green-600' WHERE slug = 'electronics';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop', color = 'from-yellow-400 to-orange-500' WHERE slug = 'home';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop', color = 'from-blue-300 to-blue-500' WHERE slug = 'clothing';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop', color = 'from-gray-400 to-gray-600' WHERE slug = 'parts';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?q=80&w=400&auto=format&fit=crop', color = 'from-pink-400 to-rose-500' WHERE slug = 'hobby';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop', color = 'from-yellow-300 to-yellow-500' WHERE slug = 'pets';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?q=80&w=400&auto=format&fit=crop', color = 'from-pink-300 to-pink-500' WHERE slug = 'beauty';
UPDATE public.categories SET image = 'https://images.unsplash.com/photo-1515488442805-d37197004f1e?q=80&w=400&auto=format&fit=crop', color = 'from-cyan-300 to-blue-400' WHERE slug = 'kids';
