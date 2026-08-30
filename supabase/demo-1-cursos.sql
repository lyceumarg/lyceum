-- =====================================================================
-- demo-1-cursos.sql
-- Dos cursos completos para mostrarle el circuito a ABE. Seguro de
-- reejecutar (guard por título, no duplica). Marcados con el prefijo
-- "[DEMO]" en el título para poder identificarlos fácil al borrar.
-- =====================================================================

-- ---------- Curso demo 1: Compliance Bancario ----------
do $$
declare
  v_tenant uuid; v_course uuid; v_mod uuid; v_les uuid; v_q uuid; v_instr uuid;
begin
  select id into v_tenant from tenants where slug = 'abe';
  if v_tenant is null then raise notice 'no existe el tenant abe'; return; end if;
  if exists (select 1 from courses where tenant_id = v_tenant and titulo = '[DEMO] Compliance Bancario: marco regulatorio BCRA') then
    raise notice 'curso demo 1 ya existe, se omite'; return;
  end if;

  -- capacitador demo (reusa uno existente con el mismo nombre si ya lo creaste)
  select id into v_instr from instructores where tenant_id = v_tenant and nombre = 'Dra. María López' limit 1;
  if v_instr is null then
    insert into instructores (tenant_id, nombre, headline, bio)
    values (v_tenant, 'Dra. María López', 'Especialista en PLAFTFP · ex-BCRA',
            'Más de 15 años de trayectoria en supervisión y cumplimiento normativo del sistema financiero argentino.')
    returning id into v_instr;
  end if;

  insert into courses (tenant_id, titulo, descripcion, precio, categoria, estado, emite_participacion, emite_certificacion, capacitador_id)
  values (v_tenant, '[DEMO] Compliance Bancario: marco regulatorio BCRA',
          'Estructura de cumplimiento en entidades financieras reguladas: gobierno, controles internos y reporting.',
          74900, 'Compliance · Banca', 'publicado', true, true, v_instr)
  returning id into v_course;

  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'El BCRA y el sistema financiero', 0) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden, es_muestra_gratis) values (v_tenant, v_mod, 'Rol del Banco Central', 0, true) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>El <strong>BCRA</strong> regula y supervisa a las entidades financieras. Sus normas (Comunicaciones A) son de cumplimiento obligatorio.</p>')),
    (v_tenant, v_les, 'video', 1, jsonb_build_object('titulo','Funciones del BCRA (10:20)','proveedor','YouTube','url','https://www.youtube.com')),
    (v_tenant, v_les, 'link', 2, jsonb_build_object('titulo','Comunicaciones del BCRA','fuente','BCRA','url','https://www.bcra.gob.ar'));
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Supervisión y sanciones', 1) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>El régimen sancionatorio alcanza a la entidad y a las personas responsables.</p>')),
    (v_tenant, v_les, 'download', 1, jsonb_build_object('nombre','Guia de supervision.pdf','tipo_archivo','PDF','url','#'));

  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'Gobierno corporativo y controles', 1) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Las tres líneas de defensa', 0) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>Primera línea: el negocio. Segunda: cumplimiento y riesgos. Tercera: auditoría interna.</p>')),
    (v_tenant, v_les, 'quiz', 1, jsonb_build_object('pregunta','Cumplimiento se ubica en la...','opciones', jsonb_build_array('Primera línea','Segunda línea','Tercera línea'),'correcta',1));

  insert into exam_config (course_id, tenant_id, cant_preguntas, nota_corte, max_intentos, aleatorizar)
  values (v_course, v_tenant, 3, 70, 3, true);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'Las Comunicaciones A del BCRA son:', 'Son normativa de cumplimiento obligatorio.') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Normativa de cumplimiento obligatorio', true),
    (v_tenant, v_q, 'Recomendaciones no vinculantes', false),
    (v_tenant, v_q, 'Comunicados de prensa', false);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'En el modelo de tres líneas, cumplimiento está en:', '') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'La segunda línea', true),
    (v_tenant, v_q, 'La primera línea', false),
    (v_tenant, v_q, 'La tercera línea', false);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'La protección al usuario financiero incluye:', '') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Transparencia y gestión de reclamos', true),
    (v_tenant, v_q, 'Maximizar comisiones', false),
    (v_tenant, v_q, 'Restringir el acceso a productos', false);

  insert into certificate_signers (tenant_id, course_id, nombre, cargo, orden)
  values (v_tenant, v_course, 'Dra. María López', 'Directora Académica · Academia ABE', 0);

  raise notice 'curso demo 1 (Compliance Bancario) creado';
end $$;

-- ---------- Curso demo 2: Debida Diligencia (KYC/DDC) ----------
do $$
declare
  v_tenant uuid; v_course uuid; v_mod uuid; v_les uuid; v_q uuid; v_instr uuid;
begin
  select id into v_tenant from tenants where slug = 'abe';
  if v_tenant is null then return; end if;
  if exists (select 1 from courses where tenant_id = v_tenant and titulo = '[DEMO] Debida Diligencia del Cliente (KYC/DDC)') then
    raise notice 'curso demo 2 ya existe, se omite'; return;
  end if;

  select id into v_instr from instructores where tenant_id = v_tenant and nombre = 'Dra. María López' limit 1;

  insert into courses (tenant_id, titulo, descripcion, precio, categoria, estado, emite_participacion, emite_certificacion, capacitador_id)
  values (v_tenant, '[DEMO] Debida Diligencia del Cliente (KYC/DDC)',
          'Onboarding digital cumpliendo estándares KYC: identificación, verificación y perfil transaccional.',
          59900, 'Onboarding · Fintech', 'publicado', true, true, v_instr)
  returning id into v_course;

  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'Fundamentos de KYC', 0) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden, es_muestra_gratis) values (v_tenant, v_mod, 'Identificación vs verificación', 0, true) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p><strong>Identificar</strong> es conocer quién es el cliente; <strong>verificar</strong> es probarlo con evidencia confiable.</p>')),
    (v_tenant, v_les, 'slides', 1, jsonb_build_object('titulo','Flujo de onboarding remoto','proveedor','Google Slides','url','https://docs.google.com'));
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Documentación requerida', 1) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>Documento de identidad, prueba de domicilio y, según riesgo, declaración de origen de fondos.</p>'));

  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'Perfilado y riesgo', 1) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Perfil transaccional', 0) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>El perfil esperado permite detectar desvíos. Es la base del monitoreo posterior.</p>')),
    (v_tenant, v_les, 'quiz', 1, jsonb_build_object('pregunta','Verificar la identidad significa:','opciones', jsonb_build_array('Probarla con evidencia confiable','Solo pedir el nombre','Confiar en la declaración'),'correcta',0));

  insert into exam_config (course_id, tenant_id, cant_preguntas, nota_corte, max_intentos, aleatorizar)
  values (v_course, v_tenant, 2, 70, 3, true);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'La debida diligencia reforzada aplica a:', 'A mayor riesgo, mayor intensidad de controles.') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Clientes de alto riesgo', true),
    (v_tenant, v_q, 'Todos por igual', false),
    (v_tenant, v_q, 'Nadie', false);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'El perfil transaccional sirve para:', '') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Detectar desvíos en el monitoreo', true),
    (v_tenant, v_q, 'Aprobar cualquier operación', false),
    (v_tenant, v_q, 'Reemplazar la identificación', false);

  insert into certificate_signers (tenant_id, course_id, nombre, cargo, orden)
  values (v_tenant, v_course, 'Dra. María López', 'Directora Académica · Academia ABE', 0);

  raise notice 'curso demo 2 (KYC/DDC) creado';
end $$;
