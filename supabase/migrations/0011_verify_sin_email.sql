-- =====================================================================
-- 0011_verify_sin_email.sql
-- Ajuste de privacidad: verify_certificate NO expone el email en la
-- verificación pública. Si el participante no cargó su nombre, muestra un
-- texto neutro. (El nombre real se completa desde el perfil / registro.)
-- Reemplaza la versión de 0010.
-- =====================================================================
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(p_id_publico text)
returns table (
  titular text, curso text, academia text, academia_logo text, tipo text,
  fecha_emision timestamptz, fecha_vencimiento date, estado text,
  puntaje int, firmantes jsonb
)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.nombre, ''), 'Titular sin nombre cargado') as titular,
         c.titulo, b.nombre_academia, b.logo_url, cert.tipo,
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
