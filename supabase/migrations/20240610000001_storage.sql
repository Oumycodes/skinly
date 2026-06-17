insert into storage.buckets (id, name, public)
values ('scan-images', 'scan-images', false),
       ('product-images', 'product-images', false)
on conflict (id) do nothing;

create policy "Users upload own scan images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own scan images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users upload own product images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own product images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
