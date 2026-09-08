-- =====================================================================
-- 0022_staff_admin.sql
-- Permite que un tenant_admin gestione el rol de otros perfiles de su
-- misma academia (para agregar/quitar administradores desde el panel,
-- sin necesitar SQL). No puede tocar perfiles de otro tenant, ni
-- asignar 'platform_admin'.
-- =====================================================================

create policy profiles_update_staff on profiles for update
  using (tenant_id = public.current_tenant_id() and public.current_rol() = 'tenant_admin')
  with check (
    tenant_id = public.current_tenant_id()
    and public.current_rol() = 'tenant_admin'
    and rol in ('tenant_admin', 'instructor', 'participante')
  );
