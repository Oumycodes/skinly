-- How / when the product is used on the shelf
alter table public.shelf_products
  add column if not exists usage_time text;

alter table public.shelf_products
  add column if not exists times_per_week integer;

comment on column public.shelf_products.usage_time is 'morning | night | both';
comment on column public.shelf_products.times_per_week is 'How many days per week the product is used (1-7)';
