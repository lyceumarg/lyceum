-- =====================================================================
-- 0020_prueba_interna.sql
-- Permite que el staff se autoinscriba en su propio curso (publicado o
-- no) para probarlo como lo vería un participante real, sin ensuciar
-- Ganancias ni Participantes con esa inscripción.
-- =====================================================================

alter table enrollments add column if not exists es_prueba boolean not null default false;

-- participantes_con_avance excluye las inscripciones de prueba interna.
drop function if exists public.participantes_con_avance();
create or replace function public.participantes_con_avance()
returns table (
  enrollment_id uuid, estado text, origen text, fecha_inscripcion timestamptz, cortesia boolean,
  alumno_nombre text, alumno_email text, curso_titulo text, curso_precio numeric,
  total_lecciones int, lecciones_hechas int, avance_pct int,
  cert_puntaje int, cert_fecha timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    e.id, e.estado, e.origen, e.fecha_inscripcion, e.cortesia,
    p.nombre, p.email, c.titulo, c.precio,
    (select count(*)::int from lessons l join modules m on m.id = l.module_id where m.course_id = c.id) as total_lecciones,
    (select count(*)::int from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
       where lp.enrollment_id = e.id and m.course_id = c.id and lp.completada) as lecciones_hechas,
    case
      when (select count(*) from lessons l join modules m on m.id = l.module_id where m.course_id = c.id) = 0 then 0
      else round(
        100.0 * (select count(*) from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
                  where lp.enrollment_id = e.id and m.course_id = c.id and lp.completada)
        / (select count(*) from lessons l join modules m on m.id = l.module_id where m.course_id = c.id)
      )::int
    end as avance_pct,
    (select cert.puntaje from certificates cert where cert.enrollment_id = e.id and cert.tipo = 'certificacion'
       order by cert.fecha_emision desc limit 1) as cert_puntaje,
    coalesce(
      (select cert.fecha_emision from certificates cert where cert.enrollment_id = e.id and cert.tipo = 'certificacion'
         order by cert.fecha_emision desc limit 1),
      (select cert.fecha_emision from certificates cert where cert.enrollment_id = e.id and cert.tipo = 'participacion'
         order by cert.fecha_emision desc limit 1)
    ) as cert_fecha
  from enrollments e
  join profiles p on p.id = e.user_id
  join courses c on c.id = e.course_id
  where e.tenant_id = public.current_tenant_id() and public.is_tenant_staff() and not e.es_prueba
  order by e.fecha_inscripcion desc
  limit 300
$$;
grant execute on function public.participantes_con_avance() to authenticated;
