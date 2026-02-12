-- Migration: Add image support and read status to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS type text DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachment_url text;

-- Bucket for chat images (must be created in Supabase UI)
-- insert into storage.buckets (id, name, public) values ('chat-images', 'chat-images', true) on conflict (id) do nothing;
