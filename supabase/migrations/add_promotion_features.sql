-- Миграция: Добавление функционала "Продвижения" объвлений (VIP)

-- 1. Добавляем колонки в таблицу ads
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_color_highlight BOOLEAN DEFAULT false;

-- 2. Создаем таблицу транзакций (если еще нет) для отслеживания оплат
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'RUB',
    status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
    payment_id VARCHAR(255), -- ID из ЮKassa
    payment_method VARCHAR(100), -- yookassa, wallet, etc
    package_type VARCHAR(100), -- e.g., 'vip_7_days', 'highlight_3_days'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Настраиваем RLS для транзакций (пользователь видит только свои)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can orchestrate transactions"
    ON public.transactions FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');
