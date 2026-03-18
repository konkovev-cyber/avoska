-- Полный SQL скрипт для синхронизации всех категорий в базе данных Supabase
-- Скопируйте и выполните этот код в SQL Editor вашего проекта Supabase

INSERT INTO categories (name, slug, image)
VALUES 
  ('Транспорт', 'transport', '/categories/transport.jpg'),
  ('Недвижимость', 'real-estate', '/categories/real-estate.jpg'),
  ('Аренда квартир', 'rent-apartments', '/categories/rent-apartments.jpg'),
  ('Аренда коммерции', 'rent-commercial', '/categories/rent-commercial.jpg'),
  ('Аренда авто', 'rent-cars', '/categories/rent-cars.jpg'),
  ('Работа', 'jobs', '/categories/jobs.jpg'),
  ('Услуги', 'services', '/categories/services.jpg'),
  ('Аренда инструмента', 'rent-tools', '/categories/rent-tools.jpg'),
  ('Электроника', 'electronics', '/categories/electronics.jpg'),
  ('Дом и дача', 'home', '/categories/home.jpg'),
  ('Одежда', 'clothing', '/categories/clothing.jpg'),
  ('Запчасти', 'parts', '/categories/parts.jpg'),
  ('Хобби', 'hobby', '/categories/hobby.jpg'),
  ('Животные', 'pets', '/categories/pets.jpg'),
  ('Красота', 'beauty', '/categories/beauty.jpg'),
  ('Детское', 'kids', '/categories/kids.jpg'),
  ('Для бизнеса', 'business', '/categories/business.jpg'),
  ('Спорт и отдых', 'sport', '/categories/sport.jpg')
ON CONFLICT (slug) 
DO UPDATE SET 
  name = EXCLUDED.name,
  image = EXCLUDED.image;

-- Проверка результата
SELECT * FROM categories ORDER BY name;
