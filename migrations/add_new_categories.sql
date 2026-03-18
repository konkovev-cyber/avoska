-- SQL скрипт для добавления новых категорий в базу данных Supabase
-- Скопируйте и выполните этот код в SQL Editor вашего проекта Supabase

INSERT INTO categories (name, slug, image)
VALUES 
  ('Для бизнеса', 'business', '/categories/business.jpg'),
  ('Спорт и отдых', 'sport', '/categories/sport.jpg')
ON CONFLICT (slug) 
DO UPDATE SET 
  name = EXCLUDED.name,
  image = EXCLUDED.image;

-- Проверка результата
SELECT * FROM categories WHERE slug IN ('business', 'sport');
