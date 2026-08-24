-- =====================================================================
-- 0008_seed_signers.sql — dev only. Habilita constancia de participación
-- en el curso demo de ABE y carga un firmante (sin imagen; la firma real
-- se sube desde el panel). Requiere 0007.
-- =====================================================================
do $$
declare v_tenant uuid; v_course uuid;
begin
  select id into v_tenant from tenants where slug = 'abe';
  select id into v_course from courses where tenant_id = v_tenant order by created_at limit 1;
  if v_course is not null then
    update courses set emite_participacion = true, emite_certificacion = true where id = v_course;
    if not exists (select 1 from certificate_signers where course_id = v_course) then
      insert into certificate_signers (tenant_id, course_id, nombre, cargo, orden)
      values (v_tenant, v_course, 'Dra. María López', 'Directora Académica · Academia ABE', 0);
    end if;
  end if;
end $$;
