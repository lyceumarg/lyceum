-- =====================================================================
-- 0003_seed.sql — Datos de ejemplo (tenant ABE) para desarrollo local.
-- Corré esto SOLO en entornos de dev. No incluye usuarios auth (esos se
-- crean vía el flujo de signup / super-admin con service_role).
-- =====================================================================

do $$
declare
  v_plan uuid;
  v_tenant uuid;
  v_course uuid;
  v_mod uuid;
  v_les uuid;
  v_q uuid;
begin
  insert into platform_plans (nombre, precio_mensual, limites)
  values ('Pro', 99000, '{"cursos": null, "alumnos": 2000, "storage_gb": 50}')
  returning id into v_plan;

  insert into tenants (nombre, slug, plan_id)
  values ('Asociación de la Banca Especializada', 'abe', v_plan)
  returning id into v_tenant;

  insert into tenant_domains (tenant_id, host, es_primario)
  values (v_tenant, 'abe.localhost:3000', true),
         (v_tenant, 'academia.abe.org.ar', false);

  insert into tenant_branding (tenant_id, nombre_academia, color_primario)
  values (v_tenant, 'Academia ABE', '#1f5c9c');

  insert into subscriptions (tenant_id, plan_id, estado, periodo_inicio)
  values (v_tenant, v_plan, 'activa', current_date);

  insert into courses (tenant_id, titulo, descripcion, precio, categoria, estado)
  values (v_tenant,
          'Prevención de Lavado de Activos y Financiación del Terrorismo',
          'Marco UIF y estándares FATF aplicados a sujetos obligados. Enfoque basado en riesgo, DDC y reportes.',
          89900, 'Compliance · PLAFTFP', 'publicado')
  returning id into v_course;

  insert into modules (tenant_id, course_id, titulo, orden)
  values (v_tenant, v_course, 'Marco normativo y sujetos obligados', 0)
  returning id into v_mod;

  insert into lessons (tenant_id, module_id, titulo, orden, es_muestra_gratis)
  values (v_tenant, v_mod, 'Ley 25.246 y estructura de la UIF', 0, true)
  returning id into v_les;

  insert into content_blocks (tenant_id, lesson_id, tipo, orden, contenido)
  values
    (v_tenant, v_les, 'richtext', 0, '{"html":"<p>La <strong>Ley 25.246</strong> crea la UIF y el régimen de prevención de LA/FT.</p>"}'),
    (v_tenant, v_les, 'link', 1, '{"title":"Ley 25.246 — texto oficial","source":"InfoLeg","url":"https://www.infoleg.gob.ar"}');

  insert into exam_config (course_id, tenant_id, cant_preguntas, nota_corte, max_intentos, aleatorizar)
  values (v_course, v_tenant, 4, 70, 3, true);

  insert into questions (tenant_id, course_id, enunciado, explicacion)
  values (v_tenant, v_course,
          'Ante un cliente de alto riesgo LA/FT, ¿qué corresponde?',
          'A mayor riesgo, mayor intensidad de controles: DDC reforzada.')
  returning id into v_q;

  insert into question_options (tenant_id, question_id, texto, es_correcta)
  values (v_tenant, v_q, 'Aplicar debida diligencia reforzada', true),
         (v_tenant, v_q, 'Rechazar automáticamente la relación', false),
         (v_tenant, v_q, 'Reducir controles para agilizar', false),
         (v_tenant, v_q, 'Omitir el monitoreo por ser conocido', false);
end $$;
