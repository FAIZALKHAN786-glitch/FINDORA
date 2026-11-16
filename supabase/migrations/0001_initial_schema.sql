-- Lost & Found: initial schema

create extension if not exists "pgcrypto";

-- profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  student_id text,
  email text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update their own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- items
create table public.items (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  category text check (category in ('Books','Electronics','Clothing','Keys','ID & Documents','Bags','Other')),
  status text default 'lost' check (status in ('lost','found','claimed','returned')),
  location text,
  lost_found_date date,
  photo_url text,
  reporter_id uuid references public.profiles(id),
  reporter_email text,
  reporter_phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.items enable row level security;

create policy "Items are viewable by everyone"
  on public.items for select
  using ( true );

create policy "Users can insert their own items"
  on public.items for insert
  with check ( auth.uid() = reporter_id );

create policy "Users can update their own items"
  on public.items for update
  using ( auth.uid() = reporter_id );

create policy "Users can delete their own items"
  on public.items for delete
  using ( auth.uid() = reporter_id );

-- storage bucket for item photos
insert into storage.buckets (id, name, public)
values ('item-photos', 'item-photos', true)
on conflict (id) do nothing;

create policy "Item photos are publicly viewable"
  on storage.objects for select
  using ( bucket_id = 'item-photos' );

create policy "Authenticated users can upload item photos"
  on storage.objects for insert
  with check ( bucket_id = 'item-photos' );
