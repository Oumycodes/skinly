-- Multi-angle scan images (front, left profile, right profile)
alter table public.skin_scans
  add column if not exists image_paths jsonb default '{}'::jsonb;

comment on column public.skin_scans.image_paths is
  'Map of angle -> storage path, e.g. {"front":"uid/scan/front.jpg","left":"...","right":"..."}';
