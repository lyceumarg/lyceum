-- =====================================================================
-- 0010_perfil_historial.sql
-- - verify_certificate: si el participante no cargó nombre, usa el email
--   como respaldo (para que el certificado nunca salga sin titular).
-- - my_courses: agrega cert_fecha para el historial de cursos realizados.
-- =====================================================================

-- verify_certificate: titular con respaldo a email
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(p_id_publico text)
returns table (
  titular text, curso text, academia text, academia_logo text, tipo text,
  fecha_emision timestamptz, fecha_vencimiento date, estado text,
  puntaje int, firmantes jsonb
)
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.nombre, ''), u.email) as titular,
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
  join auth.users u      on u.id = e.user_id
  join courses c         on c.id = e.course_id
  join tenant_branding b on b.tenant_id = cert.tenant_id
  where cert.id_publico = p_id_publico
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- my_courses: sumar cert_fecha (fecha de emisión de la credencial vigente)
create or replace function public.my_courses()
returns table (
  course_id uuid, titulo text, categoria text, estado text,
  total int, done int, cert_id text, cert_tipo text, cert_fecha timestamptz,
  emite_participacion boolean, emite_certificacion boolean
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.titulo, c.categoria, e.estado,
    (select count(*)::int from lessons l join modules m on m.id = l.module_id where m.course_id = c.id) as total,
    (select count(*)::int from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
       where lp.enrollment_id = e.id and m.course_id = c.id and lp.completada) as done,
    (select cert.id_publico from certificates cert where cert.enrollment_id = e.id and cert.estado = 'valido'
       order by cert.fecha_emision desc limit 1) as cert_id,
    (select cert.tipo from certificates cert where cert.enrollment_id = e.id and cert.estado = 'valido'
       order by cert.fecha_emision desc limit 1) as cert_tipo,
    (select cert.fecha_emision from certificates cert where cert.enrollment_id = e.id and cert.estado = 'valido'
       order by cert.fecha_emision desc limit 1) as cert_fecha,
    c.emite_participacion, c.emite_certificacion
  from enrollments e
  join courses c on c.id = e.course_id
  where e.user_id = auth.uid() and e.tenant_id = public.current_tenant_id()
  order by e.fecha_inscripcion desc
$$;
grant execute on function public.my_courses() to authenticated;
