-- Enable PostGIS if needed for advanced geo-queries (optional, using simple lat/lng for now)
-- create extension if not exists postgis;

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  rating numeric default 0,
  is_verified boolean default false,
  created_at timestamptz default now()
);

-- Turn on RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Categories Table
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  icon text, -- Lucide icon name or URL
  parent_id uuid references public.categories(id),
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "Categories are viewable by everyone."
  on public.categories for select using ( true );

-- Only admins/service_role can insert (no policy for public insert)


-- 3. Ads Table
create type ad_status as enum ('active', 'closed', 'archived', 'pending', 'rejected');

create table public.ads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text not null,
  description text not null,
  price numeric,
  salary_from numeric,
  salary_to numeric,
  currency text default 'RUB',
  status ad_status default 'pending',
  images text[], -- Array of URLs
  city text,
  lat double precision,
  lng double precision,
  delivery_possible boolean default false,
  condition text default 'used',
  specifications jsonb default '{}', -- For category-specific fields (mileage, area, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ads enable row level security;

-- Ads Policies
create policy "Active ads are public"
  on public.ads for select
  using ( status = 'active' );

create policy "Users can see their own non-active ads"
  on public.ads for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own ads"
  on public.ads for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own ads"
  on public.ads for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own ads"
  on public.ads for delete
  using ( auth.uid() = user_id );

-- 3.1 Trigger for Max 10 Active Ads
create or replace function check_ad_limit()
returns trigger as $$
declare
  active_count int;
begin
  -- Only check if insert or if status changes to 'active'
  if (TG_OP = 'INSERT') or (TG_OP = 'UPDATE' and NEW.status = 'active' and OLD.status <> 'active') then
     select count(*) into active_count
     from public.ads
     where user_id = NEW.user_id and status = 'active';

     if active_count >= 10 then
       raise exception 'Limit reached: You cannot have more than 10 active ads.';
     end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger enforce_ad_limit
  before insert or update on public.ads
  for each row execute procedure check_ad_limit();


-- 4. Messages Table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  ad_id uuid references public.ads(id) on delete set null,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can see messages they sent or received"
  on public.messages for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

create policy "Users can send messages"
  on public.messages for insert
  with check ( auth.uid() = sender_id );


-- 5. Favorites Table
create table public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  ad_id uuid references public.ads(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, ad_id)
);

alter table public.favorites enable row level security;

create policy "Users can manage their favorites"
  on public.favorites for all
  using ( auth.uid() = user_id );


-- 6. Reviews Table
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  reviewer_id uuid references public.profiles(id) not null,
  target_user_id uuid references public.profiles(id) not null,
  ad_id uuid references public.ads(id),
  rating int check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews for select using ( true );

create policy "Authenticated users can create reviews"
  on public.reviews for insert
  with check ( auth.uid() = reviewer_id );


-- 7. Push Subscriptions Table
create table public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null unique,
  platform text check (platform in ('web', 'ios', 'android')),
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their push subs"
  on public.push_subscriptions for all
  using ( auth.uid() = user_id );


-- Initial Data: Categories
insert into public.categories (name, slug, icon) values
('Недвижимость', 'real-estate', 'Home'),
('Транспорт', 'transport', 'Car'),
('Электроника', 'electronics', 'Smartphone'),
('Одежда', 'clothing', 'Shirt'),
('Хобби и отдых', 'hobby', 'Gamepad'),
('Для дома', 'home', 'Armchair');
