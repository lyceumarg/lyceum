-- =====================================================================
-- seed_demo.sql — Cursos de demostración completos para ABE.
-- Pegá esto en el SQL Editor de Supabase y ejecutá. Es seguro: cada curso
-- se crea solo si no existe ya (guard por título), así podés reejecutarlo.
-- Requiere el esquema completo aplicado (migraciones 0001..0008).
--
-- Cómo autoras más cursos: copiá un bloque DO, cambiá título/módulos/lecciones/
-- bloques/preguntas. Claves de 'contenido' por tipo de bloque:
--   video|slides|embed -> {titulo, proveedor, url}
--   richtext           -> {html}
--   link               -> {titulo, fuente, url}
--   download           -> {nombre, tipo_archivo, url}
--   quiz               -> {pregunta, opciones:[...], correcta: <indice 0-based>}
-- =====================================================================

-- ---------- Curso A: Compliance Bancario (BCRA) ----------
do $$
declare
  v_tenant uuid; v_course uuid; v_mod uuid; v_les uuid; v_q uuid;
begin
  select id into v_tenant from tenants where slug = 'abe';
  if v_tenant is null then raise notice 'no existe el tenant abe'; return; end if;
  if exists (select 1 from courses where tenant_id = v_tenant and titulo = 'Compliance Bancario: marco regulatorio BCRA') then
    raise notice 'curso BCRA ya existe, se omite'; return;
  end if;

  insert into courses (tenant_id, titulo, descripcion, precio, categoria, estado, emite_participacion, emite_certificacion)
  values (v_tenant, 'Compliance Bancario: marco regulatorio BCRA',
          'Estructura de cumplimiento en entidades financieras reguladas: gobierno, controles internos y reporting.',
          74900, 'Compliance · Banca', 'publicado', true, true)
  returning id into v_course;

  -- Módulo 1
  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'El BCRA y el sistema financiero', 0) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden, es_muestra_gratis) values (v_tenant, v_mod, 'Rol del Banco Central', 0, true) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>El <strong>BCRA</strong> regula y supervisa a las entidades financieras. Sus normas (Comunicaciones A) son de cumplimiento obligatorio.</p>')),
    (v_tenant, v_les, 'video', 1, jsonb_build_object('titulo','Funciones del BCRA (10:20)','proveedor','YouTube','url','https://www.youtube.com')),
    (v_tenant, v_les, 'link', 2, jsonb_build_object('titulo','Comunicaciones del BCRA','fuente','BCRA','url','https://www.bcra.gob.ar'));
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Supervisión y sanciones', 1) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>El régimen sancionatorio alcanza a la entidad y a las personas responsables. La colaboración con el supervisor es clave.</p>')),
    (v_tenant, v_les, 'download', 1, jsonb_build_object('nombre','Guia de supervision.pdf','tipo_archivo','PDF - 620 KB','url','#'));

  -- Módulo 2
  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'Gobierno corporativo y controles', 1) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Las tres lineas de defensa', 0) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>Primera linea: el negocio. Segunda: cumplimiento y riesgos. Tercera: auditoria interna.</p>')),
    (v_tenant, v_les, 'quiz', 1, jsonb_build_object('pregunta','Cumplimiento se ubica en la...','opciones', jsonb_build_array('Primera linea','Segunda linea','Tercera linea','Fuera del modelo'),'correcta',1));
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Proteccion al usuario financiero', 1) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>Transparencia, gestion de reclamos y reporting al regulador son pilares de la proteccion al usuario.</p>'));

  -- Examen
  insert into exam_config (course_id, tenant_id, cant_preguntas, nota_corte, max_intentos, aleatorizar)
  values (v_course, v_tenant, 3, 70, 3, true);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'Las Comunicaciones A del BCRA son:', 'Son normativa de cumplimiento obligatorio.') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Normativa de cumplimiento obligatorio', true),
    (v_tenant, v_q, 'Recomendaciones no vinculantes', false),
    (v_tenant, v_q, 'Comunicados de prensa', false);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'En el modelo de tres lineas, cumplimiento esta en:', '') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'La segunda linea', true),
    (v_tenant, v_q, 'La primera linea', false),
    (v_tenant, v_q, 'La tercera linea', false);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'La proteccion al usuario financiero incluye:', '') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Transparencia y gestion de reclamos', true),
    (v_tenant, v_q, 'Maximizar comisiones', false),
    (v_tenant, v_q, 'Restringir el acceso a productos', false);

  -- Firmante
  insert into certificate_signers (tenant_id, course_id, nombre, cargo, orden)
  values (v_tenant, v_course, 'Dra. Maria Lopez', 'Directora Academica - Academia ABE', 0);

  raise notice 'curso BCRA creado';
end $$;


-- ---------- Curso B: KYC / Debida Diligencia ----------
do $$
declare
  v_tenant uuid; v_course uuid; v_mod uuid; v_les uuid; v_q uuid;
begin
  select id into v_tenant from tenants where slug = 'abe';
  if v_tenant is null then return; end if;
  if exists (select 1 from courses where tenant_id = v_tenant and titulo = 'Debida Diligencia del Cliente (KYC/DDC)') then
    raise notice 'curso KYC ya existe, se omite'; return;
  end if;

  insert into courses (tenant_id, titulo, descripcion, precio, categoria, estado, emite_participacion, emite_certificacion)
  values (v_tenant, 'Debida Diligencia del Cliente (KYC/DDC)',
          'Onboarding digital cumpliendo estandares KYC: identificacion, verificacion y perfil transaccional.',
          59900, 'Onboarding · Fintech', 'publicado', true, true)
  returning id into v_course;

  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'Fundamentos de KYC', 0) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden, es_muestra_gratis) values (v_tenant, v_mod, 'Identificacion vs verificacion', 0, true) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p><strong>Identificar</strong> es conocer quien es el cliente; <strong>verificar</strong> es probarlo con evidencia confiable.</p>')),
    (v_tenant, v_les, 'slides', 1, jsonb_build_object('titulo','Flujo de onboarding remoto','proveedor','Google Slides','url','https://docs.google.com'));
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Documentacion requerida', 1) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>Documento de identidad, prueba de domicilio y, segun riesgo, declaracion de origen de fondos.</p>'));

  insert into modules (tenant_id, course_id, titulo, orden) values (v_tenant, v_course, 'Perfilado y riesgo', 1) returning id into v_mod;
  insert into lessons (tenant_id, module_id, titulo, orden) values (v_tenant, v_mod, 'Perfil transaccional', 0) returning id into v_les;
  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido) values
    (v_tenant, v_les, 'richtext', 0, jsonb_build_object('html','<p>El perfil esperado permite detectar desvios. Es la base del monitoreo posterior.</p>')),
    (v_tenant, v_les, 'quiz', 1, jsonb_build_object('pregunta','Verificar la identidad significa:','opciones', jsonb_build_array('Probarla con evidencia confiable','Solo pedir el nombre','Confiar en la declaracion'),'correcta',0));

  insert into exam_config (course_id, tenant_id, cant_preguntas, nota_corte, max_intentos, aleatorizar)
  values (v_course, v_tenant, 2, 70, 3, true);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'La debida diligencia reforzada aplica a:', 'A mayor riesgo, mayor intensidad de controles.') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Clientes de alto riesgo', true),
    (v_tenant, v_q, 'Todos por igual', false),
    (v_tenant, v_q, 'Nadie', false);

  insert into questions (tenant_id, course_id, enunciado, explicacion) values (v_tenant, v_course, 'El perfil transaccional sirve para:', '') returning id into v_q;
  insert into question_options (tenant_id, question_id, texto, es_correcta) values
    (v_tenant, v_q, 'Detectar desvios en el monitoreo', true),
    (v_tenant, v_q, 'Aprobar cualquier operacion', false),
    (v_tenant, v_q, 'Reemplazar la identificacion', false);

  insert into certificate_signers (tenant_id, course_id, nombre, cargo, orden)
  values (v_tenant, v_course, 'Dra. Maria Lopez', 'Directora Academica - Academia ABE', 0);

  raise notice 'curso KYC creado';
end $$;
