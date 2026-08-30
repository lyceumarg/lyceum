-- =====================================================================
-- demo-3-completar.sql
-- Corré esto DESPUÉS de:
--   1) demo-1-cursos.sql (los 2 cursos demo)
--   2) Inscribir a los participantes demo por "Inscripción masiva" en el
--      panel (pestaña del curso → Inscripción masiva), pegando la lista
--      de emails de demo-2-participantes.txt en CADA uno de los 2 cursos.
--
-- Este script toma esas inscripciones y simula que el participante
-- completó el 100% del contenido, rindió el examen y aprobó — quedando
-- con certificado emitido y verificable, listo para mostrar. Seguro de
-- reejecutar (no duplica progreso ni certificados).
-- =====================================================================

do $$
declare
  v_tenant uuid;
  v_course record;
  v_enroll record;
  v_lesson record;
  v_q record;
  v_correct_opt uuid;
  v_answers jsonb;
  v_total_preg int;
  v_score int;
  v_pub text;
begin
  select id into v_tenant from tenants where slug = 'abe';
  if v_tenant is null then raise notice 'no existe el tenant abe'; return; end if;

  for v_course in
    select id, emite_participacion, emite_certificacion
    from courses where tenant_id = v_tenant and titulo like '[DEMO]%'
  loop
    for v_enroll in
      select e.id as enrollment_id, e.user_id
      from enrollments e
      where e.tenant_id = v_tenant and e.course_id = v_course.id and e.origen = 'masivo'
    loop
      -- 1) marcar todas las lecciones del curso como completadas
      for v_lesson in
        select l.id from lessons l join modules m on m.id = l.module_id where m.course_id = v_course.id
      loop
        insert into lesson_progress (tenant_id, enrollment_id, lesson_id, completada, fecha)
        values (v_tenant, v_enroll.enrollment_id, v_lesson.id, true, now() - (random() * interval '20 days'))
        on conflict (enrollment_id, lesson_id) do update set completada = true;
      end loop;

      -- 2) armar respuestas TODAS correctas (demo prolija: 100% en el examen)
      v_answers := '{}'::jsonb;
      v_total_preg := 0;
      for v_q in select id from questions where course_id = v_course.id loop
        select id into v_correct_opt from question_options where question_id = v_q.id and es_correcta limit 1;
        if v_correct_opt is not null then
          v_answers := v_answers || jsonb_build_object(v_q.id::text, v_correct_opt::text);
          v_total_preg := v_total_preg + 1;
        end if;
      end loop;
      v_score := case when v_total_preg > 0 then 100 else null end;

      if v_total_preg > 0 and not exists (select 1 from exam_attempts where enrollment_id = v_enroll.enrollment_id) then
        insert into exam_attempts (tenant_id, enrollment_id, puntaje, aprobado, respuestas, fecha)
        values (v_tenant, v_enroll.enrollment_id, v_score, true, v_answers, now() - (random() * interval '15 days'));
      end if;

      -- 3) certificado de participación (si el curso lo emite)
      if coalesce(v_course.emite_participacion, false)
         and not exists (select 1 from certificates where enrollment_id = v_enroll.enrollment_id and tipo = 'participacion') then
        v_pub := upper(substr(md5(gen_random_uuid()::text),1,3)) || '-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text, 4, '0');
        insert into certificates (id_publico, tenant_id, enrollment_id, puntaje, tipo, fecha_emision)
        values (v_pub, v_tenant, v_enroll.enrollment_id, null, 'participacion', now() - (random() * interval '10 days'));
      end if;

      -- 4) certificado de aprobación (si el curso lo emite y hubo examen)
      if coalesce(v_course.emite_certificacion, false) and v_total_preg > 0
         and not exists (select 1 from certificates where enrollment_id = v_enroll.enrollment_id and tipo = 'certificacion') then
        v_pub := upper(substr(md5(gen_random_uuid()::text),1,3)) || '-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text, 4, '0');
        insert into certificates (id_publico, tenant_id, enrollment_id, puntaje, tipo, fecha_emision)
        values (v_pub, v_tenant, v_enroll.enrollment_id, v_score, 'certificacion', now() - (random() * interval '10 days'));
      end if;

      -- 5) marcar la inscripción como completada
      update enrollments set estado = 'completada' where id = v_enroll.enrollment_id;
    end loop;
  end loop;

  raise notice 'listo: participantes demo marcados como completados';
end $$;
