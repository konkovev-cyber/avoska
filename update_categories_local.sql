-- Обновление категорий с локальными изображениями
-- Выполните этот скрипт в Supabase SQL Editor

UPDATE public.categories SET image = '/categories/transport.jpg' WHERE slug = 'transport';
UPDATE public.categories SET image = '/categories/real-estate.jpg' WHERE slug = 'real-estate';
UPDATE public.categories SET image = '/categories/jobs.jpg' WHERE slug = 'jobs';
UPDATE public.categories SET image = '/categories/services.jpg' WHERE slug = 'services';
UPDATE public.categories SET image = '/categories/electronics.jpg' WHERE slug = 'electronics';
UPDATE public.categories SET image = '/categories/home.jpg' WHERE slug = 'home';
UPDATE public.categories SET image = '/categories/clothing.jpg' WHERE slug = 'clothing';
UPDATE public.categories SET image = '/categories/parts.jpg' WHERE slug = 'parts';
UPDATE public.categories SET image = '/categories/hobby.jpg' WHERE slug = 'hobby';
UPDATE public.categories SET image = '/categories/pets.jpg' WHERE slug = 'pets';
UPDATE public.categories SET image = '/categories/beauty.jpg' WHERE slug = 'beauty';
UPDATE public.categories SET image = '/categories/kids.jpg' WHERE slug = 'kids';

-- Убедимся, что color также установлен (из предыдущего шага, но на всякий случай)
UPDATE public.categories SET color = 'from-orange-400 to-red-500' WHERE slug = 'transport';
UPDATE public.categories SET color = 'from-blue-400 to-blue-600' WHERE slug = 'real-estate';
UPDATE public.categories SET color = 'from-red-400 to-red-600' WHERE slug = 'jobs';
UPDATE public.categories SET color = 'from-purple-400 to-purple-600' WHERE slug = 'services';
UPDATE public.categories SET color = 'from-green-400 to-green-600' WHERE slug = 'electronics';
UPDATE public.categories SET color = 'from-yellow-400 to-orange-500' WHERE slug = 'home';
UPDATE public.categories SET color = 'from-blue-300 to-blue-500' WHERE slug = 'clothing';
UPDATE public.categories SET color = 'from-gray-400 to-gray-600' WHERE slug = 'parts';
UPDATE public.categories SET color = 'from-pink-400 to-rose-500' WHERE slug = 'hobby';
UPDATE public.categories SET color = 'from-yellow-300 to-yellow-500' WHERE slug = 'pets';
UPDATE public.categories SET color = 'from-pink-300 to-pink-500' WHERE slug = 'beauty';
UPDATE public.categories SET color = 'from-cyan-300 to-blue-400' WHERE slug = 'kids';
