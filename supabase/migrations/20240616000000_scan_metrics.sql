alter table public.skin_scans
  add column if not exists metrics jsonb default '[]'::jsonb;
