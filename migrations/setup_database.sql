-- 1. Добавляем недостающие колонки в таблицу категорий
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='image') THEN
        ALTER TABLE public.categories ADD COLUMN image text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='color') THEN
        ALTER TABLE public.categories ADD COLUMN color text;
    END IF;
END $$;

-- 2. Очищаем старые данные (опционально, или просто используем upsert)
-- DELETE FROM public.cities;

-- 3. Загружаем города
INSERT INTO public.cities (name) VALUES 
('Горячий Ключ'),
('ст. Саратовская'),
('ст. Бакинская'),
('ст. Имеретинская'),
('ст. Мартанская'),
('ст. Пятигорская'),
('ст. Кутаисская'),
('п. Первомайский'),
('п. Приреченский'),
('х. Молькин'),
('х. Кунтечи'),
('ст. Черноморская'),
('ст. Калужская'),
('ст. Новодмитриевская')
ON CONFLICT (name) DO NOTHING;

-- 4. Загружаем категории с картинками и цветами
INSERT INTO public.categories (name, slug, image, color) VALUES 
('Транспорт', 'transport', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=400&auto=format&fit=crop', 'from-orange-400 to-red-500'),
('Недвижимость', 'real-estate', 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop', 'from-blue-400 to-blue-600'),
('Работа', 'jobs', 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=400&auto=format&fit=crop', 'from-red-400 to-red-600'),
('Услуги', 'services', 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=400&auto=format&fit=crop', 'from-purple-400 to-purple-600'),
('Электроника', 'electronics', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=400&auto=format&fit=crop', 'from-green-400 to-green-600'),
('Дом и дача', 'home', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop', 'from-yellow-400 to-orange-500'),
('Личные вещи', 'clothing', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop', 'from-blue-300 to-blue-500'),
('Запчасти', 'parts', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop', 'from-gray-400 to-gray-600'),
('Хобби', 'hobby', 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?q=80&w=400&auto=format&fit=crop', 'from-pink-400 to-rose-500'),
('Животные', 'pets', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop', 'from-yellow-300 to-yellow-500'),
('Красота', 'beauty', 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?q=80&w=400&auto=format&fit=crop', 'from-pink-300 to-pink-500'),
('Детское', 'kids', 'https://images.unsplash.com/photo-1515488442805-d37197004f1e?q=80&w=400&auto=format&fit=crop', 'from-cyan-300 to-blue-400')
ON CONFLICT (slug) DO UPDATE SET 
    image = EXCLUDED.image,
    color = EXCLUDED.color,
    name = EXCLUDED.name;
