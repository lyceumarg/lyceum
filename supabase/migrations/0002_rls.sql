-- =====================================================================
-- 0002_rls.sql — Aislamiento por tenant (RLS), roles y superficie segura
-- Modelo:
--   * El tenant del usuario autenticado sale del JWT (app_metadata.tenant_id),
--     que NO es editable por el cliente (se setea con service_role al crear).
--   * Las tablas de plataforma quedan sin policies -> denegadas para anon y
--     authenticated (solo service_role, usado por la app del proveedor).
--   * Lo público (catálogo, branding, verificación) se sirve por FUNCIONES
--     security definer con salida mínima -> anon nunca toca tablas directo.
--   * El examen se corrige del lado servidor: el participante no tiene acceso
--     de lectura a questions/question_options.
-- =====================================================================

-- ---------- Helpers de contexto (leen el JWT) ----------
create or replace function public.current_tenant_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid
$$;

create or replace function public.current_rol() returns text
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', 'participante')
$$;

create or replace function public.is_tenant_staff() returns boolean
language sql stable as $$
  select public.current_rol() in ('tenant_admin','instructor')
$$;

-- ---------- Alta de usuario -> crea profile con tenant/rol del app_metadata ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, tenant_id, rol, nombre)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(new.raw_app_meta_data ->> 'rol', 'participante'),
    new.raw_user_meta_data ->> 'nombre'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- HABILITAR RLS EN TODO
-- =====================================================================
alter table platform_plans   enable row level security;
alter table tenants          enable row level security;
alter table tenant_domains   enable row level security;
alter table tenant_branding  enable row level security;
alter table subscriptions    enable row level security;
alter table profiles         enable row level security;
alter table courses          enable row level security;
alter table modules          enable row level security;
alter table lessons          enable row level security;
alter table content_blocks   enable row level security;
alter table enrollments      enable row level security;
alter table lesson_progress  enable row level security;
alter table questions        enable row level security;
alter table question_options enable row level security;
alter table exam_config      enable row level security;
alter table exam_attempts    enable row level security;
alter table certificates     enable row level security;
alter table orders           enable row level security;
alter table coupons          enable row level security;

-- Tablas de plataforma: SIN policies. Quedan denegadas para anon/authenticated;
-- solo service_role (app del proveedor / super-admin) las opera.
-- (platform_plans, tenants, tenant_domains, subscriptions)

-- =====================================================================
-- PROFILES
-- =====================================================================
create policy profiles_select on profiles for select using (
  id = auth.uid()
  or (tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin')
);
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- =====================================================================
-- TENANT_BRANDING — el tenant lee su propia marca; el admin la edita.
-- =====================================================================
create policy branding_select on tenant_branding for select using (
  tenant_id = public.current_tenant_id()
);
create policy branding_upsert on tenant_branding for all using (
  tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin'
) with check (
  tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin'
);

-- =====================================================================
-- COURSES / MODULES / LESSONS — lectura por tenant; gestión por staff.
-- (El catálogo público anónimo se sirve por RPC, no por estas policies.)
-- =====================================================================
create policy courses_select on courses for select using (tenant_id = public.current_tenant_id());
create policy courses_manage on courses for all
  using (
    tenant_id = public.current_tenant_id()
    and (public.current_rol() = 'tenant_admin'
         or (public.current_rol() = 'instructor' and instructor_id = auth.uid()))
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (public.current_rol() = 'tenant_admin'
         or (public.current_rol() = 'instructor' and instructor_id = auth.uid()))
  );

create policy modules_select on modules for select using (tenant_id = public.current_tenant_id());
create policy modules_manage on modules for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

create policy lessons_select on lessons for select using (tenant_id = public.current_tenant_id());
create policy lessons_manage on lessons for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- =====================================================================
-- CONTENT_BLOCKS — visible si hay inscripción activa (o muestra gratis),
-- o si sos staff del tenant.
-- =====================================================================
create policy blocks_select on content_blocks for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.is_tenant_staff()
    or exists (
      select 1 from lessons l where l.id = content_blocks.lesson_id and l.es_muestra_gratis
    )
    or exists (
      select 1
      from lessons l
      join modules m   on m.id = l.module_id
      join enrollments e on e.course_id = m.course_id
      where l.id = content_blocks.lesson_id
        and e.user_id = auth.uid()
        and e.estado = 'activa'
    )
  )
);
create policy blocks_manage on content_blocks for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- =====================================================================
-- ENROLLMENTS — el participante ve/gestiona las suyas; el admin todas las del tenant.
-- =====================================================================
create policy enroll_select on enrollments for select using (
  tenant_id = public.current_tenant_id()
  and (user_id = auth.uid() or public.current_rol() = 'tenant_admin')
);
create policy enroll_insert_self on enrollments for insert with check (
  tenant_id = public.current_tenant_id() and user_id = auth.uid()
);
create policy enroll_admin on enrollments for all
  using (tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin')
  with check (tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin');

-- =====================================================================
-- LESSON_PROGRESS — dueño vía enrollment.
-- =====================================================================
create policy progress_all on lesson_progress for all
  using (
    tenant_id = public.current_tenant_id()
    and exists (select 1 from enrollments e where e.id = lesson_progress.enrollment_id and e.user_id = auth.uid())
  )
  with check (
    tenant_id = public.current_tenant_id()
    and exists (select 1 from enrollments e where e.id = lesson_progress.enrollment_id and e.user_id = auth.uid())
  );

-- =====================================================================
-- EXAMEN — CONTENIDO SENSIBLE. Participante SIN acceso de lectura.
-- Solo staff gestiona; la corrección corre en submit_exam() (definer).
-- =====================================================================
create policy questions_manage on questions for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

create policy options_manage on question_options for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- exam_config: no expone respuestas -> el participante puede leer corte/cantidad.
create policy examcfg_select on exam_config for select using (tenant_id = public.current_tenant_id());
create policy examcfg_manage on exam_config for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- =====================================================================
-- EXAM_ATTEMPTS / CERTIFICATES / ORDERS — el participante ve lo suyo.
-- Las escrituras críticas pasan por funciones definer / webhook (service_role).
-- =====================================================================
create policy attempts_select on exam_attempts for select using (
  tenant_id = public.current_tenant_id()
  and (public.current_rol() = 'tenant_admin'
       or exists (select 1 from enrollments e where e.id = exam_attempts.enrollment_id and e.user_id = auth.uid()))
);

create policy certs_select on certificates for select using (
  tenant_id = public.current_tenant_id()
  and (public.current_rol() = 'tenant_admin'
       or exists (select 1 from enrollments e where e.id = certificates.enrollment_id and e.user_id = auth.uid()))
);
create policy certs_admin on certificates for all
  using (tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin')
  with check (tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin');

create policy orders_select on orders for select using (
  tenant_id = public.current_tenant_id()
  and (user_id = auth.uid() or public.current_rol() = 'tenant_admin')
);

create policy coupons_manage on coupons for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- =====================================================================
-- SUPERFICIE PÚBLICA SEGURA (security definer, salida mínima, por host)
-- anon nunca lee tablas directo: solo estas funciones.
-- =====================================================================

-- Marca del tenant a partir del host (para tematizar la academia).
create or replace function public.branding_by_host(p_host text)
returns table (tenant_id uuid, nombre_academia text, logo_url text, color_primario text)
language sql stable security definer set search_path = public as $$
  select b.tenant_id, b.nombre_academia, b.logo_url, b.color_primario
  from tenant_domains d
  join tenants t        on t.id = d.tenant_id and t.estado = 'activo'
  join tenant_branding b on b.tenant_id = d.tenant_id
  where d.host = p_host
$$;

-- Catálogo público del tenant (solo cursos publicados, campos mínimos).
create or replace function public.catalog_by_host(p_host text)
returns table (id uuid, titulo text, descripcion text, portada_url text,
               precio numeric, moneda text, categoria text, modulos bigint)
language sql stable security definer set search_path = public as $$
  select c.id, c.titulo, c.descripcion, c.portada_url, c.precio, c.moneda, c.categoria,
         (select count(*) from modules m where m.course_id = c.id) as modulos
  from tenant_domains d
  join courses c on c.tenant_id = d.tenant_id
  where d.host = p_host and c.estado = 'publicado'
  order by c.created_at desc
$$;

-- Detalle público de un curso publicado: temario sin contenido interno.
create or replace function public.course_detail_public(p_host text, p_course uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'titulo', c.titulo, 'descripcion', c.descripcion,
    'precio', c.precio, 'moneda', c.moneda, 'categoria', c.categoria,
    'corte', coalesce(ec.nota_corte, 70),
    'modulos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'titulo', m.titulo,
               'lecciones', (select jsonb_agg(l.titulo order by l.orden) from lessons l where l.module_id = m.id)
             ) order by m.orden)
      from modules m where m.course_id = c.id), '[]'::jsonb)
  )
  from tenant_domains d
  join courses c on c.tenant_id = d.tenant_id
  left join exam_config ec on ec.course_id = c.id
  where d.host = p_host and c.id = p_course and c.estado = 'publicado'
$$;

-- Verificación pública de certificado: salida mínima, con la academia emisora.
-- No expone otros tenants ni la plataforma.
create or replace function public.verify_certificate(p_id_publico text)
returns table (titular text, curso text, academia text, fecha_emision timestamptz,
               fecha_vencimiento date, estado text, puntaje int)
language sql stable security definer set search_path = public as $$
  select p.nombre, c.titulo, b.nombre_academia, cert.fecha_emision,
         cert.fecha_vencimiento, cert.estado, cert.puntaje
  from certificates cert
  join enrollments e     on e.id = cert.enrollment_id
  join profiles p        on p.id = e.user_id
  join courses c         on c.id = e.course_id
  join tenant_branding b on b.tenant_id = cert.tenant_id
  where cert.id_publico = p_id_publico
$$;

-- =====================================================================
-- CORRECCIÓN DEL EXAMEN (server-side). El cliente NO decide la nota.
-- Verifica inscripción, avance 100%, intentos; corrige contra el banco;
-- registra el intento y emite certificado si aprueba.
-- =====================================================================
create or replace function public.submit_exam(p_course uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_tenant    uuid := public.current_tenant_id();
  v_enroll    uuid;
  v_cfg       exam_config%rowtype;
  v_total     int;
  v_done      int;
  v_intentos  int;
  v_correct   int := 0;
  v_qcount    int := 0;
  v_score     int;
  v_pass      boolean;
  v_cert_pub  text;
  q           record;
begin
  if v_uid is null or v_tenant is null then
    raise exception 'no autenticado';
  end if;

  select e.id into v_enroll
  from enrollments e
  where e.course_id = p_course and e.user_id = v_uid and e.tenant_id = v_tenant and e.estado = 'activa';
  if v_enroll is null then
    raise exception 'sin inscripción activa';
  end if;

  -- avance requerido: 100% de las lecciones del curso
  select count(*) into v_total
  from lessons l join modules m on m.id = l.module_id where m.course_id = p_course;
  select count(*) into v_done
  from lesson_progress lp
  join lessons l on l.id = lp.lesson_id
  join modules m on m.id = l.module_id
  where lp.enrollment_id = v_enroll and m.course_id = p_course and lp.completada;
  if v_total = 0 or v_done < v_total then
    raise exception 'avance insuficiente';
  end if;

  select * into v_cfg from exam_config where course_id = p_course;
  select count(*) into v_intentos from exam_attempts where enrollment_id = v_enroll;
  if v_cfg.max_intentos is not null and v_intentos >= v_cfg.max_intentos then
    raise exception 'sin intentos disponibles';
  end if;

  -- corrección: p_answers = { "<question_id>": "<option_id>" }
  for q in select id from questions where course_id = p_course loop
    v_qcount := v_qcount + 1;
    if exists (
      select 1 from question_options o
      where o.question_id = q.id and o.es_correcta
        and o.id = (p_answers ->> q.id::text)::uuid
    ) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  if v_qcount = 0 then
    raise exception 'examen sin preguntas';
  end if;

  v_score := round(v_correct::numeric / v_qcount * 100);
  v_pass  := v_score >= coalesce(v_cfg.nota_corte, 70);

  insert into exam_attempts (tenant_id, enrollment_id, puntaje, aprobado, respuestas)
  values (v_tenant, v_enroll, v_score, v_pass, p_answers);

  if v_pass then
    -- una sola credencial vigente por inscripción
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

-- Exponer solo las funciones públicas a anon (además de authenticated).
grant execute on function public.branding_by_host(text)        to anon, authenticated;
grant execute on function public.catalog_by_host(text)         to anon, authenticated;
grant execute on function public.course_detail_public(text,uuid) to anon, authenticated;
grant execute on function public.verify_certificate(text)      to anon, authenticated;
grant execute on function public.submit_exam(uuid, jsonb)      to authenticated;
