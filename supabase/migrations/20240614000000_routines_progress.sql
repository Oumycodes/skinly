-- User AM/PM routines
create table public.user_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period text not null check (period in ('AM', 'PM')),
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'INCOMPLETE' check (status in ('READY', 'INCOMPLETE')),
  updated_at timestamptz not null default now(),
  unique (user_id, period)
);

create index user_routines_user_id_idx on public.user_routines (user_id);

-- Weekly progress check-ins
create table public.progress_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  overall_score int not null check (overall_score between 0 and 100),
  image_path text,
  checkin_at timestamptz not null default now()
);

create index progress_checkins_user_id_idx on public.progress_checkins (user_id);
create index progress_checkins_checkin_at_idx on public.progress_checkins (checkin_at desc);

alter table public.profiles add column if not exists streak int not null default 0;

alter table public.user_routines enable row level security;
alter table public.progress_checkins enable row level security;

create policy "Users read own routines"
  on public.user_routines for select
  using (auth.uid() = user_id);

create policy "Users read own checkins"
  on public.progress_checkins for select
  using (auth.uid() = user_id);
