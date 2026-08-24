-- =====================================================================
-- 0006_powered_by.sql — "Powered by Lyceum" opcional por tenant.
-- Se renderiza SOLO en el footer de la app del tenant; nunca en el
-- certificado ni en la verificación pública. Derivado del plan (regla de
-- negocio): plan base -> true; Pro/Enterprise -> false (white-label total).
-- =====================================================================
alter table tenant_branding
  add column if not exists powered_by boolean not null default true;

-- branding_by_host cambia de firma (suma powered_by): hay que DROP + CREATE.
drop function if exists public.branding_by_host(text);
create or replace function public.branding_by_host(p_host text)
returns table (tenant_id uuid, nombre_academia text, logo_url text, color_primario text, powered_by boolean)
language sql stable security definer set search_path = public as $$
  select b.tenant_id, b.nombre_academia, b.logo_url, b.color_primario, b.powered_by
  from tenant_domains d
  join tenants t         on t.id = d.tenant_id and t.estado = 'activo'
  join tenant_branding b on b.tenant_id = d.tenant_id
  where d.host = p_host
$$;
grant execute on function public.branding_by_host(text) to anon, authenticated;

-- ABE es premium (compliance/banca): white-label total, sin powered-by.
update tenant_branding set powered_by = false
 where tenant_id = (select id from tenants where slug = 'abe');
