-- Обновление категорий на ЛОКАЛЬНЫЕ SVG файлы
-- Это 100% рабочее решение, которое не требует интернета

UPDATE public.categories SET image = '/categories/transport.svg' WHERE slug = 'transport';
UPDATE public.categories SET image = '/categories/real-estate.svg' WHERE slug = 'real-estate';
UPDATE public.categories SET image = '/categories/jobs.svg' WHERE slug = 'jobs';
UPDATE public.categories SET image = '/categories/services.svg' WHERE slug = 'services';
UPDATE public.categories SET image = '/categories/electronics.svg' WHERE slug = 'electronics';
UPDATE public.categories SET image = '/categories/home.svg' WHERE slug = 'home';
UPDATE public.categories SET image = '/categories/clothing.svg' WHERE slug = 'clothing';
UPDATE public.categories SET image = '/categories/parts.svg' WHERE slug = 'parts';
UPDATE public.categories SET image = '/categories/hobby.svg' WHERE slug = 'hobby';
UPDATE public.categories SET image = '/categories/pets.svg' WHERE slug = 'pets';
UPDATE public.categories SET image = '/categories/beauty.svg' WHERE slug = 'beauty';
UPDATE public.categories SET image = '/categories/kids.svg' WHERE slug = 'kids';

-- Сброс цвета, так как он уже встроен в SVG (иконки будут цветными сами по себе)
UPDATE public.categories SET color = NULL;
