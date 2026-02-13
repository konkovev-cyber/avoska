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
CREATE POLICY "Public banners are viewable by everyone" ON public.banners
    FOR SELECT USING (true); -- Or (is_active = true)

CREATE POLICY "Admins can manage banners" ON public.banners
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Insert 3 test banners
INSERT INTO public.banners (title, content, image_url, link_url, is_active)
VALUES
    ('Распродажа электроники', 'Скидки до 50% на все гаджеты только в этом месяце!', 'https://images.unsplash.com/photo-1498049381929-c81600b11d61?auto=format&fit=crop&w=800&q=80', '/category/electronics', true),
    ('Вакансия: Курьер', 'Ищем курьеров на личном авто. Высокая зарплата, свободный график.', 'https://images.unsplash.com/photo-1556740758-90de292080a9?auto=format&fit=crop&w=800&q=80', '/jobs', true),
    ('Сдайте старые вещи', 'Принимаем одежду в хорошем состоянии. Поможем нуждающимся вместе!', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=800&q=80', '/help', true);
