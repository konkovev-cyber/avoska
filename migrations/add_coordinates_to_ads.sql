-- Migration: Add coordinates to ads
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS longitude double precision;

-- Create index for radius search if needed later
CREATE INDEX IF NOT EXISTS ads_lat_long_idx ON public.ads (latitude, longitude);
