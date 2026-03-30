-- Migration: Add statistics tracking to banners table and RPC functions
-- 1. Add columns to banners table
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0;
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;

-- 1.1. Initialize existing nulls (if any)
UPDATE public.banners SET impressions_count = 0 WHERE impressions_count IS NULL;
UPDATE public.banners SET clicks_count = 0 WHERE clicks_count IS NULL;

-- 2. Function to safely increment banner impression
CREATE OR REPLACE FUNCTION increment_banner_impression(banner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.banners
  SET impressions_count = impressions_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to safely increment banner click
CREATE OR REPLACE FUNCTION increment_banner_click(banner_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.banners
  SET clicks_count = clicks_count + 1
  WHERE id = banner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Permissions for anonymous and authenticated users
GRANT EXECUTE ON FUNCTION increment_banner_impression(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_banner_click(UUID) TO anon, authenticated;
