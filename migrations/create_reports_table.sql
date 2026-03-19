-- Migration: Create reports table
create table if not exists public.reports (
    id uuid default gen_random_uuid() primary key,
    ad_id uuid references public.ads(id) on delete cascade not null,
    reporter_id uuid references public.profiles(id) on delete set null,
    reason text not null,
    status text default 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at timestamptz default now()
);

-- RLS
alter table public.reports enable row level security;

create policy "Users can insert reports."
  on public.reports for insert
  with check ( auth.uid() = reporter_id );

create policy "Admins can view and manage reports."
  on public.reports for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
