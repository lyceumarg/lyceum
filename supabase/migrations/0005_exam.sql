-- =====================================================================
-- 0005_exam.sql — Entrega del examen al participante SIN respuestas correctas.
-- Revalida inscripción, avance 100% e intentos. La corrección sigue en
-- submit_exam() (0002). Juntas garantizan integridad: el cliente nunca ve
-- qué opción es correcta ni decide la nota.
-- =====================================================================
create or replace function public.get_exam(p_course uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  v_tenant  uuid := public.current_tenant_id();
  v_enroll  uuid;
  v_cfg     exam_config%rowtype;
  v_total   int;
  v_done    int;
  v_intentos int;
  v_qs      jsonb;
begin
  if v_uid is null then raise exception 'no autenticado'; end if;

  select id into v_enroll
  from enrollments
  where course_id = p_course and user_id = v_uid and tenant_id = v_tenant and estado = 'activa';
  if v_enroll is null then raise exception 'sin inscripción activa'; end if;

  select count(*) into v_total
  from lessons l join modules m on m.id = l.module_id where m.course_id = p_course;
  select count(*) into v_done
  from lesson_progress lp
  join lessons l on l.id = lp.lesson_id
  join modules m on m.id = l.module_id
  where lp.enrollment_id = v_enroll and m.course_id = p_course and lp.completada;
  if v_total = 0 or v_done < v_total then raise exception 'avance insuficiente'; end if;

  select * into v_cfg from exam_config where course_id = p_course;
  select count(*) into v_intentos from exam_attempts where enrollment_id = v_enroll;
  if v_cfg.max_intentos is not null and v_intentos >= v_cfg.max_intentos then
    raise exception 'sin intentos disponibles';
  end if;

  select jsonb_agg(jsonb_build_object(
           'id', q.id,
           'enunciado', q.enunciado,
           'tipo', q.tipo,
           'opciones', (
             select jsonb_agg(jsonb_build_object('id', o.id, 'texto', o.texto) order by random())
             from question_options o where o.question_id = q.id
           )
         ))
  into v_qs
  from (
    select id, enunciado, tipo
    from questions
    where course_id = p_course
    order by random()
    limit coalesce(v_cfg.cant_preguntas, 9999)
  ) q;

  return jsonb_build_object(
    'corte', coalesce(v_cfg.nota_corte, 70),
    'intento', v_intentos + 1,
    'max_intentos', v_cfg.max_intentos,
    'preguntas', coalesce(v_qs, '[]'::jsonb)
  );
end $$;

grant execute on function public.get_exam(uuid) to authenticated;

-- --------- corrección afinada: califica SOLO sobre el subconjunto entregado ---------
-- Reemplaza la versión de 0002. Exige responder las requeridas (cant_preguntas,
-- acotado al total) y usa ese total como denominador. Emite certificado si aprueba.
create or replace function public.submit_exam(p_course uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_enroll uuid;
  v_cfg exam_config%rowtype;
  v_total int; v_done int; v_intentos int; v_qtotal int; v_target int;
  v_answered int; v_correct int := 0;
  v_score int; v_pass boolean; v_cert_pub text;
  q record;
begin
  if v_uid is null or v_tenant is null then raise exception 'no autenticado'; end if;

  select e.id into v_enroll from enrollments e
   where e.course_id = p_course and e.user_id = v_uid and e.tenant_id = v_tenant and e.estado = 'activa';
  if v_enroll is null then raise exception 'sin inscripción activa'; end if;

  select count(*) into v_total
    from lessons l join modules m on m.id = l.module_id where m.course_id = p_course;
  select count(*) into v_done
    from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
    where lp.enrollment_id = v_enroll and m.course_id = p_course and lp.completada;
  if v_total = 0 or v_done < v_total then raise exception 'avance insuficiente'; end if;

  select * into v_cfg from exam_config where course_id = p_course;
  select count(*) into v_intentos from exam_attempts where enrollment_id = v_enroll;
  if v_cfg.max_intentos is not null and v_intentos >= v_cfg.max_intentos then
    raise exception 'sin intentos disponibles';
  end if;

  select count(*) into v_qtotal from questions where course_id = p_course;
  v_target := least(coalesce(v_cfg.cant_preguntas, v_qtotal), v_qtotal);

  select count(*) into v_answered
  from questions qq where qq.course_id = p_course and (p_answers ? qq.id::text);
  if v_answered < v_target then raise exception 'examen incompleto'; end if;

  for q in
    select qq.id from questions qq where qq.course_id = p_course and (p_answers ? qq.id::text)
  loop
    if exists (
      select 1 from question_options o
      where o.question_id = q.id and o.es_correcta
        and o.id = (p_answers ->> q.id::text)::uuid
    ) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  v_score := round(v_correct::numeric / v_target * 100);
  v_pass  := v_score >= coalesce(v_cfg.nota_corte, 70);

  insert into exam_attempts (tenant_id, enrollment_id, puntaje, aprobado, respuestas)
  values (v_tenant, v_enroll, v_score, v_pass, p_answers);

  if v_pass then
    if not exists (select 1 from certificates where enrollment_id = v_enroll and estado = 'valido') then
      v_cert_pub := upper(substr(md5(gen_random_uuid()::text),1,3)) || '-' ||
                    to_char(now(),'YYYY') || '-' ||
                    lpad((floor(random()*9000)+1000)::text, 4, '0');
      insert into certificates (id_publico, tenant_id, enrollment_id, puntaje)
      values (v_cert_pub, v_tenant, v_enroll, v_score);
    else
      select id_publico into v_cert_pub from certificates
      where enrollment_id = v_enroll and estado = 'valido' limit 1;
    end if;
    update enrollments set estado = 'completada' where id = v_enroll;
  end if;

  return jsonb_build_object('puntaje', v_score, 'aprobado', v_pass, 'certificado', v_cert_pub);
end $$;

grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
