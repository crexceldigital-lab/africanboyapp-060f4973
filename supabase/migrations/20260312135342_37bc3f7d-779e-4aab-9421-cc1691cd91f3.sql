
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "Anyone can read gallery" on storage.objects
for select using (bucket_id = 'gallery');

create policy "Admins can upload gallery" on storage.objects
for insert to authenticated
with check (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete gallery" on storage.objects
for delete to authenticated
using (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));
