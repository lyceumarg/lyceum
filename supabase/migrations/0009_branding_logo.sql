-- =====================================================================
-- 0009_branding_logo.sql
-- - Bucket 'logos' para el logo de cada academia (lectura pública;
--   escritura solo staff, dentro de la carpeta de su tenant).
-- - verify_certificate suma el logo de la academia, para poder mostrarlo
--   en el certificado y en la verificación pública.
-- (La edición de tenant_branding ya está habilitada por la policy
--  branding_upsert de 0002: tenant_admin edita su propia marca.)
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy logos_lectura_publica on storage.objects for select
  using (bucket_id = 'logos');
create policy logos_escritura_staff on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy logos_update_staff on storage.objects for update to authenticated
  using (bucket_id = 'logos' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy logos_delete_staff on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);

-- verify_certificate: sumar el logo de la academia (academia_logo)
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(p_id_publico text)
returns table (
  titular text, curso text, academia text, academia_logo text, tipo text,
  fecha_emision timestamptz, fecha_vencimiento date, estado text,
  puntaje int, firmantes jsonb
)
language sql stable security definer set search_path = public as $$
  select p.nombre, c.titulo, b.nombre_academia, b.logo_url, cert.tipo,
         cert.fecha_emision, cert.fecha_vencimiento, cert.estado, cert.puntaje,
         coalesce((
           select jsonb_agg(jsonb_build_object('nombre', s.nombre, 'cargo', s.cargo, 'firma_url', s.firma_url)
                            order by s.orden)
           from certificate_signers s where s.course_id = e.course_id
         ), '[]'::jsonb)
  from certificates cert
  join enrollments e     on e.id = cert.enrollment_id
  join profiles p        on p.id = e.user_id
  join courses c         on c.id = e.course_id
  join tenant_branding b on b.tenant_id = cert.tenant_id
  where cert.id_publico = p_id_publico
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;
