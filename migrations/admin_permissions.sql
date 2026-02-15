-- Migration: Admin Permissions for Profiles and Ads
-- This script adds the necessary columns and RLS policies for administrative actions

-- 1. Ensure columns exist (Safely)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attname = 'is_banned') THEN
        ALTER TABLE public.profiles ADD COLUMN is_banned boolean DEFAULT false;
    END IF;
END $$;

-- 2. Drop existing restrictive policies for management
DROP POLICY IF EXISTS "Admins can manage all ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- 3. Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin' OR email IN ('ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com'))
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add Admin policies for Ads
CREATE POLICY "Admins can manage all ads"
  ON public.ads
  FOR ALL
  TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- 5. Add Admin policies for Profiles
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ( public.is_admin() )
  WITH CHECK ( public.is_admin() );

-- 6. Ensure some users are admins (Initial bootstrap)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com');
