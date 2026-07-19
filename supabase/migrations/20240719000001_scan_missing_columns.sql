-- Columns referenced by the app but missing on some live projects
alter table public.skin_scans
  add column if not exists image_paths jsonb default '{}'::jsonb;

alter table public.skin_scans
  add column if not exists metrics jsonb default '[]'::jsonb;

comment on column public.skin_scans.image_paths is
  'Map of angle -> storage path, e.g. {"front":"...","left":"...","right":"..."}';

comment on column public.skin_scans.metrics is
  'Legacy per-metric array [{id, label, score 0-100, regions}]';
