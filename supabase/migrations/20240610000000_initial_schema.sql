-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- Skin scan results
create table public.skin_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_path text,
  overall_score int not null check (overall_score between 0 and 100),
  summary text not null,
  conditions jsonb not null default '[]'::jsonb,
  scanned_at timestamptz not null default now()
);

create index skin_scans_user_id_idx on public.skin_scans (user_id);
create index skin_scans_scanned_at_idx on public.skin_scans (scanned_at desc);

-- User product shelf
create table public.shelf_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  brand text,
  barcode text,
  ingredients text[] not null default '{}',
  source text not null check (source in ('photo', 'barcode', 'manual')),
  image_url text,
  created_at timestamptz not null default now()
);

create index shelf_products_user_id_idx on public.shelf_products (user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security
alter table public.profiles enable row level security;
alter table public.skin_scans enable row level security;
alter table public.shelf_products enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users read own scans"
  on public.skin_scans for select
  using (auth.uid() = user_id);

create policy "Users read own shelf"
  on public.shelf_products for select
  using (auth.uid() = user_id);

create policy "Users insert own shelf items"
  on public.shelf_products for insert
  with check (auth.uid() = user_id);

create policy "Users delete own shelf items"
  on public.shelf_products for delete
  using (auth.uid() = user_id);

-- Storage buckets (run via Supabase dashboard or CLI)
-- insert into storage.buckets (id, name, public) values ('scan-images', 'scan-images', false);
-- insert into storage.buckets (id, name, public) values ('product-images', 'product-images', false);
