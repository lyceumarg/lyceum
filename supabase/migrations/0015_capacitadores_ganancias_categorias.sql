-- =====================================================================
-- 0015_capacitadores_ganancias_categorias.sql
-- - profiles.alta_por_staff: marca cuentas provisionadas por el staff
--   (inscripción masiva), para bloquear su auto-inscripción.
-- - categorias: lista administrable por tenant, para reemplazar el
--   campo libre de "categoría" del curso por un <select>.
-- =====================================================================

alter table profiles add column if not exists alta_por_staff boolean not null default false;

-- El trigger de alta ahora también copia alta_por_staff desde app_metadata
-- (lo setea el endpoint de inscripción masiva al crear la cuenta).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, tenant_id, rol, nombre, email, alta_por_staff)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(new.raw_app_meta_data ->> 'rol', 'participante'),
    new.raw_user_meta_data ->> 'nombre',
    new.email,
    coalesce((new.raw_app_meta_data ->> 'alta_por_staff')::boolean, false)
  );
  return new;
end $$;

-- ---------- categorías administrables ----------
create table if not exists categorias (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  nombre     text not null,
  orden      int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, nombre)
);
create index if not exists categorias_tenant_idx on categorias(tenant_id);

alter table categorias enable row level security;
create policy categorias_select on categorias for select using (tenant_id = public.current_tenant_id());
create policy categorias_manage on categorias for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- Sembrar con las categorías que ya usan los cursos existentes (no arrancar vacío).
insert into categorias (tenant_id, nombre)
select distinct tenant_id, categoria from courses
where categoria is not null and categoria <> ''
on conflict (tenant_id, nombre) do nothing;
