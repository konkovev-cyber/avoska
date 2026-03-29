-- Add new columns for dynamic text banners
ALTER TABLE banners ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'image';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS button_text VARCHAR(100);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS background_color TEXT;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS icon_name VARCHAR(50);

-- Make image_url nullable for text-only banners
ALTER TABLE banners ALTER COLUMN image_url DROP NOT NULL;
