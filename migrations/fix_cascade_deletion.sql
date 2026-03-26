-- Migration: Fix cascade deletion for user data
-- This ensures that when a user is deleted, all their associated data is also removed.

-- 1. Fix Messages table
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey,
ADD CONSTRAINT messages_receiver_id_fkey 
  FOREIGN KEY (receiver_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

-- 2. Fix Reviews table
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey,
ADD CONSTRAINT reviews_reviewer_id_fkey 
  FOREIGN KEY (reviewer_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;

ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_target_user_id_fkey,
ADD CONSTRAINT reviews_target_user_id_fkey 
  FOREIGN KEY (target_user_id) 
  REFERENCES public.profiles(id) 
  ON DELETE CASCADE;
