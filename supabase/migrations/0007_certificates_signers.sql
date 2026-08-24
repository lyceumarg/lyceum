-- =====================================================================
-- 0007_certificates_signers.sql
-- - Dos tipos de credencial por curso:
--     * participacion  -> se emite al completar el 100% (sin examen)
--     * certificacion  -> se emite al aprobar el examen (con nota)
-- - Firmantes por curso (1–2 típicos): nombre, cargo y FIRMA DIGITALIZADA
--   (imagen en Storage, bucket 'firmas').
-- =====================================================================

-- tipo de credencial en el certificado emitido
alter table certificates
  add column if not exists tipo text not null default 'certificacion'
    check (tipo in ('participacion','certificacion'));
-- participación no tiene nota
alter table certificates alter column puntaje drop not null;

-- qué emite cada curso
alter table courses add column if not exists emite_participacion boolean not null default false;
alter table courses add column if not exists emite_certificacion  boolean not null default true;

-- firmantes del certificado (por curso)
create table if not exists certificate_signers (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  course_id  uuid not null references courses(id) on delete cascade,
  nombre     text not null,
  cargo      text,
  firma_url  text,          -- imagen de la firma digitalizada (Storage)
  orden      int not null default 0
);
create index if not exists certificate_signers_course_idx on certificate_signers(course_id);
alter table certificate_signers enable row level security;

create policy signers_select on certificate_signers for select
  using (tenant_id = public.current_tenant_id());
create policy signers_manage on certificate_signers for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- =====================================================================
-- STORAGE: bucket 'firmas' (lectura pública: la firma aparece en el
-- certificado/verificación; escritura solo staff, dentro de su tenant).
-- Convención de path:  <tenant_id>/<course_id>/<archivo>
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('firmas', 'firmas', true)
on conflict (id) do nothing;

create policy firmas_lectura_publica on storage.objects for select
  using (bucket_id = 'firmas');

create policy firmas_escritura_staff on storage.objects for insert to authenticated
  with check (
    bucket_id = 'firmas'
    and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy firmas_update_staff on storage.objects for update to authenticated
  using (
    bucket_id = 'firmas'
    and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );
create policy firmas_delete_staff on storage.objects for delete to authenticated
  using (
    bucket_id = 'firmas'
    and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
  );

-- =====================================================================
-- Emisión de CONSTANCIA DE PARTICIPACIÓN (al completar, sin examen).
-- =====================================================================
create or replace function public.emitir_participacion(p_course uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := public.current_tenant_id();
  v_enroll uuid; v_total int; v_done int; v_emite boolean; v_pub text;
begin
  if v_uid is null or v_tenant is null then raise exception 'no autenticado'; end if;

  select emite_participacion into v_emite from courses where id = p_course and tenant_id = v_tenant;
  if not coalesce(v_emite, false) then raise exception 'este curso no emite constancia de participación'; end if;

  select e.id into v_enroll from enrollments e
   where e.course_id = p_course and e.user_id = v_uid and e.tenant_id = v_tenant;
  if v_enroll is null then raise exception 'sin inscripción'; end if;

  select count(*) into v_total
    from lessons l join modules m on m.id = l.module_id where m.course_id = p_course;
  select count(*) into v_done
    from lesson_progress lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id
    where lp.enrollment_id = v_enroll and m.course_id = p_course and lp.completada;
  if v_total = 0 or v_done < v_total then raise exception 'avance insuficiente'; end if;

  if exists (select 1 from certificates where enrollment_id = v_enroll and tipo = 'participacion' and estado = 'valido') then
    select id_publico into v_pub from certificates
      where enrollment_id = v_enroll and tipo = 'participacion' and estado = 'valido' limit 1;
  else
    v_pub := upper(substr(md5(gen_random_uuid()::text),1,3)) || '-' ||
             to_char(now(),'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text, 4, '0');
    insert into certificates (id_publico, tenant_id, enrollment_id, puntaje, tipo)
    values (v_pub, v_tenant, v_enroll, null, 'participacion');
  end if;

  return jsonb_build_object('certificado', v_pub, 'tipo', 'participacion');
end $$;
grant execute on function public.emitir_participacion(uuid) to authenticated;

-- =====================================================================
-- submit_exam: emite 'certificacion' (una vigente por inscripción y tipo),
-- solo si el curso emite certificación.
-- =====================================================================
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
  v_score int; v_pass boolean; v_cert_pub text; v_emite boolean;
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

  for q in select qq.id from questions qq where qq.course_id = p_course and (p_answers ? qq.id::text) loop
    if exists (select 1 from question_options o
               where o.question_id = q.id and o.es_correcta and o.id = (p_answers ->> q.id::text)::uuid)
    then v_correct := v_correct + 1; end if;
  end loop;

  v_score := round(v_correct::numeric / v_target * 100);
  v_pass  := v_score >= coalesce(v_cfg.nota_corte, 70);

  insert into exam_attempts (tenant_id, enrollment_id, puntaje, aprobado, respuestas)
  values (v_tenant, v_enroll, v_score, v_pass, p_answers);

  select emite_certificacion into v_emite from courses where id = p_course;

  if v_pass and coalesce(v_emite, true) then
    if not exists (select 1 from certificates where enrollment_id = v_enroll and tipo = 'certificacion' and estado = 'valido') then
      v_cert_pub := upper(substr(md5(gen_random_uuid()::text),1,3)) || '-' ||
                    to_char(now(),'YYYY') || '-' || lpad((floor(random()*9000)+1000)::text, 4, '0');
      insert into certificates (id_publico, tenant_id, enrollment_id, puntaje, tipo)
      values (v_cert_pub, v_tenant, v_enroll, v_score, 'certificacion');
    else
      select id_publico into v_cert_pub from certificates
      where enrollment_id = v_enroll and tipo = 'certificacion' and estado = 'valido' limit 1;
    end if;
    update enrollments set estado = 'completada' where id = v_enroll;
  end if;

  return jsonb_build_object('puntaje', v_score, 'aprobado', v_pass, 'certificado', v_cert_pub);
end $$;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;

-- =====================================================================
-- verify_certificate: suma tipo y firmantes (con la firma). Salida mínima.
-- =====================================================================
drop function if exists public.verify_certificate(text);
create or replace function public.verify_certificate(p_id_publico text)
returns table (
  titular text, curso text, academia text, tipo text,
  fecha_emision timestamptz, fecha_vencimiento date, estado text,
  puntaje int, firmantes jsonb
)
language sql stable security definer set search_path = public as $$
  select p.nombre, c.titulo, b.nombre_academia, cert.tipo,
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

-- =====================================================================
-- my_courses: suma tipo de la credencial y qué emite el curso, para que
-- el panel del alumno ofrezca "rendir examen" o "emitir constancia".
-- =====================================================================
drop function if exists public.my_courses();
create or replace function public.my_courses()
returns table (
  course_id uuid, titulo text, categoria text, estado text,
  total int, done int, cert_id text, cert_tipo text,
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
    c.emite_participacion, c.emite_certificacion
  from enrollments e
  join courses c on c.id = e.course_id
  where e.user_id = auth.uid() and e.tenant_id = public.current_tenant_id()
  order by e.fecha_inscripcion desc
$$;
grant execute on function public.my_courses() to authenticated;
