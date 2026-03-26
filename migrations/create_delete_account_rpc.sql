-- Migration: Add function to allow users to securely delete their own accounts.
-- This satisfies the 152-FZ requirement for self-deletion of personal data.

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Unauthorized: user must be logged in to delete their account.';
  end if;

  -- Delete the user from auth.users
  -- NOTE: Any related data in public.profiles, public.ads, etc. must have
  -- ON DELETE CASCADE configured, otherwise this might fail due to foreign key violations.
  delete from auth.users where id = v_user_id;

end;
$$;
