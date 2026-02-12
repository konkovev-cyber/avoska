-- Migration: Add enhanced review features
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reply text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reply_date timestamptz;

-- Ensure storage bucket for review-images exists (metadata only, actual bucket must be created in Supabase UI)
-- insert into storage.buckets (id, name, public) values ('review-images', 'review-images', true) on conflict (id) do nothing;
