-- Таблица настроек администраторов
-- Запустите этот SQL в Supabase SQL Editor (https://app.supabase.com -> SQL Editor)

CREATE TABLE IF NOT EXISTS admin_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    telegram_chat_id text DEFAULT NULL,
    notify_new_ads boolean DEFAULT true,
    notify_new_users boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Индекс для быстрого поиска настроек по user_id
CREATE INDEX IF NOT EXISTS admin_settings_user_idx ON admin_settings(user_id);

-- RLS: только сам пользователь может читать и менять свои настройки
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read own settings"
    ON admin_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admin can upsert own settings"
    ON admin_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update own settings"
    ON admin_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role может читать всё (для API уведомлений)
-- Это работает автоматически, т.к. service role bypasses RLS
