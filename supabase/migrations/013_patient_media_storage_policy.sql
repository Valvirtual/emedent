-- bucket 'patient-media' precisa ser criado manualmente no painel do Supabase (Storage > New bucket,
-- privado, não público — contém documentos/fotos de pacientes). Estas policies permitem que o
-- backend (service role, usado no webhook) e a equipe autenticada leiam/gravem nele.
drop policy if exists "patient_media_insert_authenticated" on storage.objects;
create policy "patient_media_insert_authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'patient-media');

drop policy if exists "patient_media_select_authenticated" on storage.objects;
create policy "patient_media_select_authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'patient-media');

drop policy if exists "patient_media_delete_authenticated" on storage.objects;
create policy "patient_media_delete_authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'patient-media');
