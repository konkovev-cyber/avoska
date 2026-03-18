-- Обновление категорий, используя альтернативный источник (Picsum Photos), так как Unsplash недоступен.
-- Выполните этот скрипт в Supabase SQL Editor

UPDATE public.categories SET image = 'https://picsum.photos/id/1071/400/400', color = 'from-orange-400 to-red-500' WHERE slug = 'transport'; -- Машина
UPDATE public.categories SET image = 'https://picsum.photos/id/1031/400/400', color = 'from-blue-400 to-blue-600' WHERE slug = 'real-estate'; -- Дом
UPDATE public.categories SET image = 'https://picsum.photos/id/1/400/400', color = 'from-red-400 to-red-600' WHERE slug = 'jobs'; -- Ноутбук/Работа
UPDATE public.categories SET image = 'https://picsum.photos/id/1070/400/400', color = 'from-purple-400 to-purple-600' WHERE slug = 'services'; -- Инструменты/Ремонт
UPDATE public.categories SET image = 'https://picsum.photos/id/367/400/400', color = 'from-green-400 to-green-600' WHERE slug = 'electronics'; -- Гаджеты
UPDATE public.categories SET image = 'https://picsum.photos/id/1062/400/400', color = 'from-yellow-400 to-orange-500' WHERE slug = 'home'; -- Уют/Дом
UPDATE public.categories SET image = 'https://picsum.photos/id/1059/400/400', color = 'from-blue-300 to-blue-500' WHERE slug = 'clothing'; -- Ткань/Одежда
UPDATE public.categories SET image = 'https://picsum.photos/id/252/400/400', color = 'from-gray-400 to-gray-600' WHERE slug = 'parts'; -- Детали
UPDATE public.categories SET image = 'https://picsum.photos/id/96/400/400', color = 'from-pink-400 to-rose-500' WHERE slug = 'hobby'; -- Фото/Хобби
UPDATE public.categories SET image = 'https://picsum.photos/id/237/400/400', color = 'from-yellow-300 to-yellow-500' WHERE slug = 'pets'; -- Собака
UPDATE public.categories SET image = 'https://picsum.photos/id/360/400/400', color = 'from-pink-300 to-pink-500' WHERE slug = 'beauty'; -- Цветы/Красота
UPDATE public.categories SET image = 'https://picsum.photos/id/1084/400/400', color = 'from-cyan-300 to-blue-400' WHERE slug = 'kids'; -- Игрушка/Морж
