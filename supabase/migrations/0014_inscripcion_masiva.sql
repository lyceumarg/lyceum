-- =====================================================================
-- 0014_inscripcion_masiva.sql
-- Soporte para inscripción masiva desde el panel:
-- - profiles.email (denormalizado desde auth.users) para poder buscar,
--   POR TENANT, si un email ya tiene cuenta en esta academia, sin
--   depender de un listado global de usuarios.
-- - origen 'masivo' en enrollments, para diferenciarlo en reportes.
-- =====================================================================

alter table profiles add column if not exists email text;
create index if not exists profiles_tenant_email_idx on profiles(tenant_id, email);

-- Backfill para cuentas ya existentes.
update profiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- El trigger de alta ahora también copia el email.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, tenant_id, rol, nombre, email)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(new.raw_app_meta_data ->> 'rol', 'participante'),
    new.raw_user_meta_data ->> 'nombre',
    new.email
  );
  return new;
end $$;

-- Nuevo origen de inscripción: alta por lote desde el panel.
alter table enrollments drop constraint if exists enrollments_origen_check;
alter table enrollments add constraint enrollments_origen_check
  check (origen in ('compra','manual','cupo','masivo'));
