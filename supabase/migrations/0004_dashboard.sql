-- =====================================================================
-- 0004_dashboard.sql — Panel del alumno en una sola consulta segura.
-- Devuelve las inscripciones del usuario con avance y certificado.
-- security definer: revalida por auth.uid() + tenant del JWT.
-- =====================================================================
create or replace function public.my_courses()
returns table (
  course_id uuid, titulo text, categoria text, estado text,
  total int, done int, cert_id text
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.titulo, c.categoria, e.estado,
    (select count(*)::int
       from lessons l join modules m on m.id = l.module_id
       where m.course_id = c.id) as total,
    (select count(*)::int
       from lesson_progress lp
       join lessons l on l.id = lp.lesson_id
       join modules m on m.id = l.module_id
       where lp.enrollment_id = e.id and m.course_id = c.id and lp.completada) as done,
    (select cert.id_publico
       from certificates cert
       where cert.enrollment_id = e.id and cert.estado = 'valido'
       limit 1) as cert_id
  from enrollments e
  join courses c on c.id = e.course_id
  where e.user_id = auth.uid()
    and e.tenant_id = public.current_tenant_id()
  order by e.fecha_inscripcion desc
$$;

grant execute on function public.my_courses() to authenticated;
