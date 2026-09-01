-- =====================================================================
-- 0017_bloque_imagen.sql
-- Bloque de contenido "imagen": subida real de archivo (mismo patrón que
-- logos/instructores), no un link pegado a mano.
-- =====================================================================

alter table content_blocks drop constraint if exists content_blocks_tipo_check;
alter table content_blocks add constraint content_blocks_tipo_check
  check (tipo in ('video','slides','richtext','download','link','embed','quiz','scorm','destacado','caso_practico','imagen'));

-- ---------- Storage: imágenes de contenido de curso ----------
insert into storage.buckets (id, name, public)
values ('contenido-curso', 'contenido-curso', true)
on conflict (id) do nothing;

create policy contenido_img_lectura_publica on storage.objects for select
  using (bucket_id = 'contenido-curso');
create policy contenido_img_escritura_staff on storage.objects for insert to authenticated
  with check (bucket_id = 'contenido-curso' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy contenido_img_update_staff on storage.objects for update to authenticated
  using (bucket_id = 'contenido-curso' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy contenido_img_delete_staff on storage.objects for delete to authenticated
  using (bucket_id = 'contenido-curso' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
