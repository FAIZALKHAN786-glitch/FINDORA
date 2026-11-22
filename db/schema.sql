create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  full_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_expires_at_idx on sessions (expires_at);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 1000),
  category text not null,
  status text not null default 'lost' check (status in ('lost', 'found', 'claimed', 'returned')),
  location text check (char_length(location) <= 200),
  lost_found_date date,
  photo_url text,
  reporter_id uuid references users(id) on delete set null,
  reporter_email text not null,
  reporter_phone text check (char_length(reporter_phone) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists items_created_at_idx on items (created_at desc);
create index if not exists items_reporter_id_idx on items (reporter_id);
create index if not exists items_status_category_idx on items (status, category);
