-- 1. Enable Realtime for messages table (Critical for chat updates)
begin;
  -- Check if publication exists, if not create it (standard supabase setup has it)
  -- Then add table to it
  alter publication supabase_realtime add table messages;
exception
  when duplicate_object then null;
end;

-- 2. Storage Setup for Chat Images
-- Create the bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do update set public = true;

-- 3. Storage Policies (Fixes "new row violates row-level security policy" error)
-- Enable RLS on objects (usually enabled by default on storage.objects)
alter table storage.objects enable row level security;

-- Allow authenticated users to upload files to 'chat-images' bucket
create policy "Authenticated users can upload chat images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat-images' AND
  auth.role() = 'authenticated'
);

-- Allow public access to view images (needed for displaying them)
create policy "Public can view chat images"
on storage.objects for select
to public
using ( bucket_id = 'chat-images' );

-- 4. Ensure Messages Policies are correct
-- (Already exist based on schema, but ensuring sender check is correct)
-- create policy "Users can send messages" on public.messages for insert with check ( auth.uid() = sender_id );
