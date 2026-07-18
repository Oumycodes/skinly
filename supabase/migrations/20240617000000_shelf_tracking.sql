-- Optional per-product trial tracking settings
alter table public.shelf_products
  add column if not exists tracking_enabled boolean not null default true;

alter table public.shelf_products
  add column if not exists trial_days integer;

comment on column public.shelf_products.tracking_enabled is 'Whether this product is on a timed trial';
comment on column public.shelf_products.trial_days is 'Trial length in days when tracking_enabled is true';
