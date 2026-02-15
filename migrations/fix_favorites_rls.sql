-- Migration: Fix favorites RLS policy for INSERT operations
-- Run this script in Supabase SQL Editor to fix the favorites functionality

-- First, drop the existing policy
DROP POLICY IF EXISTS "Users can manage their favorites" ON public.favorites;

-- Create separate policies for each operation
create policy "Users can view their favorites"
  on public.favorites for select
  using ( auth.uid() = user_id );

create policy "Users can insert their favorites"
  on public.favorites for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their favorites"
  on public.favorites for delete
  using ( auth.uid() = user_id );

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'favorites';
