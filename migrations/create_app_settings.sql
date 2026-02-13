-- Create app_settings table for global settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.app_settings;
CREATE POLICY "Public settings are viewable by everyone" ON public.app_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.app_settings;
CREATE POLICY "Admins can manage settings" ON public.app_settings
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Insert default settings
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('banners_enabled', 'true', 'Включить/выключить отображение баннеров на главной странице')
ON CONFLICT (key) DO NOTHING;
