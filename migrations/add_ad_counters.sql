-- 1. Add columns to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS contacts_count INTEGER DEFAULT 0;

-- 1.1. Initialize existing nulls (if any)
UPDATE ads SET views_count = 0 WHERE views_count IS NULL;
UPDATE ads SET contacts_count = 0 WHERE contacts_count IS NULL;

-- 2. Function to safely increment view count
CREATE OR REPLACE FUNCTION increment_ad_view(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET views_count = views_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to safely increment contacts count
CREATE OR REPLACE FUNCTION increment_ad_contact(ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ads
  SET contacts_count = contacts_count + 1
  WHERE id = ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Permissions for anonymous and authenticated users
GRANT EXECUTE ON FUNCTION increment_ad_view(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_ad_contact(UUID) TO anon, authenticated;

-- 5. Index for performance on Popular Ads section
CREATE INDEX IF NOT EXISTS ads_views_count_idx ON ads (views_count DESC);
