-- Migration: Add monetization fields to ads
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS is_turbo boolean DEFAULT false;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS pinned_until timestamp with time zone;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS highlight_color text;

-- Index for promoted ads to show them first
CREATE INDEX IF NOT EXISTS ads_promoted_idx ON public.ads (is_vip DESC, is_turbo DESC, created_at DESC);
