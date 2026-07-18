-- Allow backend (service role) to manage scan images in nested folders
create policy "Service role manages scan images"
  on storage.objects for all
  to service_role
  using (bucket_id = 'scan-images')
  with check (bucket_id = 'scan-images');

-- Allow authenticated users to insert their own scan records (backend uses service role too)
create policy "Users insert own scans"
  on public.skin_scans for insert
  with check (auth.uid() = user_id);

create policy "Service role manages scans"
  on public.skin_scans for all
  to service_role
  using (true)
  with check (true);

create policy "Service role manages checkins"
  on public.progress_checkins for all
  to service_role
  using (true)
  with check (true);
