-- P18: private profile photos. Existing profiles columns and owner RLS are reused.
-- New immutable filenames make replacement recoverable and avoid cache collisions.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_avatar_owner_read" on storage.objects;
create policy "profile_avatar_owner_read" on storage.objects for select to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "profile_avatar_owner_insert" on storage.objects;
create policy "profile_avatar_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(storage.extension(name)) in ('jpg','png','webp'));
drop policy if exists "profile_avatar_owner_delete" on storage.objects;
create policy "profile_avatar_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
-- No UPDATE policy: upload a new object, save its reference, then delete the old one.
commit;
