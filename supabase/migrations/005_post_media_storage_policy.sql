-- buckets post-media e brand estavam marcados como "Public" mas sem nenhuma
-- policy: isso só permite leitura, não upload. Sem isto, qualquer upload falha.
drop policy if exists "post_media_insert_authenticated" on storage.objects;
create policy "post_media_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'post-media');

drop policy if exists "brand_insert_authenticated" on storage.objects;
create policy "brand_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'brand');

drop policy if exists "brand_update_authenticated" on storage.objects;
create policy "brand_update_authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'brand');
