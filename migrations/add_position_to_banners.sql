-- Add position column to banners table
ALTER TABLE banners ADD COLUMN IF NOT EXISTS position text DEFAULT 'top' CHECK (position IN ('top', 'sidebar'));

-- Update existing banners to 'top' default
UPDATE banners SET position = 'top' WHERE position IS NULL;

-- Enable RLS (should already be enabled, but for safety)
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
