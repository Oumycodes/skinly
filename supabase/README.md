# Supabase setup

## 1. Run migration

```bash
supabase db push
# or apply supabase/migrations/20240610000000_initial_schema.sql in the SQL editor
```

## 2. Create storage buckets

In the Supabase dashboard → Storage, create:

| Bucket | Public |
|--------|--------|
| `scan-images` | No |
| `product-images` | No |

Or run in SQL:

```sql
insert into storage.buckets (id, name, public)
values ('scan-images', 'scan-images', false),
       ('product-images', 'product-images', false);
```

## 3. Storage policies

```sql
create policy "Users upload own scan images"
  on storage.objects for insert
  with check (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own scan images"
  on storage.objects for select
  using (
    bucket_id = 'scan-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 4. Backend service role

The FastAPI backend uses `SUPABASE_SERVICE_KEY` to bypass RLS for server-side writes. Never expose this key in the mobile app.
