-- =====================================================================
-- 0012_verify_color.sql — verify_certificate suma color_primario de la
-- academia, para tematizar el certificado PDF con la marca del tenant.
-- Mantiene el titular neutro de 0011. Reemplaza la versión anterior.
-- =====================================================================
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(p_id_publico text)
returns table (
  titular text, curso text, academia text, academia_logo text, tipo text,
  fecha_emision timestamptz, fecha_vencimiento date, estado text,
  puntaje int, firmantes jsonb, color_primario text
)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.nombre, ''), 'Titular sin nombre cargado') as titular,
         c.titulo, b.nombre_academia, b.logo_url, cert.tipo,
         cert.fecha_emision, cert.fecha_vencimiento, cert.estado, cert.puntaje,
         coalesce((
           select jsonb_agg(jsonb_build_object('nombre', s.nombre, 'cargo', s.cargo, 'firma_url', s.firma_url)
                            order by s.orden)
           from certificate_signers s where s.course_id = e.course_id
         ), '[]'::jsonb),
         b.color_primario
  from certificates cert
  join enrollments e     on e.id = cert.enrollment_id
  join profiles p        on p.id = e.user_id
  join courses c         on c.id = e.course_id
  join tenant_branding b on b.tenant_id = cert.tenant_id
  where cert.id_publico = p_id_publico
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;
