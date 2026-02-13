-- Create banners table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Create policies
DROP POLICY IF EXISTS "Public banners are viewable by everyone" ON public.banners;
CREATE POLICY "Public banners are viewable by everyone" ON public.banners
    FOR SELECT USING (true); -- Or (is_active = true)

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Insert 3 test banners (RU-friendly)
INSERT INTO public.banners (title, content, image_url, link_url, is_active)
VALUES
    ('Распродажа электроники', 'Скидки до 50% на все гаджеты только в этом месяце!', 'https://avatars.mds.yandex.net/get-mpic/11394341/2a0000019230678e38d745e6566089307c92/600x600', '/category/electronics', true),
    ('Вакансия: Курьер', 'Ищем курьеров на личном авто. Высокая зарплата, свободный график.', 'https://avatars.mds.yandex.net/get-zen_doc/1585805/pub_5d8091a92beb4900ad30ee7a_5d8092284386a100ad8c0490/scale_1200', '/jobs', true),
    ('Сдайте старые вещи', 'Принимаем одежду в хорошем состоянии. Поможем нуждающимся вместе!', 'https://avatars.mds.yandex.net/get-pdb/1531633/2c6a0b94-8f9f-44e2-8d76-8d76c66938a9/s1200', '/help', true);
