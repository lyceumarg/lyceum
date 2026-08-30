-- =====================================================================
-- reparar-tenant-id-nulo.sql
-- Repara perfiles cuyo tenant_id quedó vacío por la condición de carrera
-- de Supabase (app_metadata se escribe DESPUÉS del alta del usuario, el
-- trigger que arma el profile a veces se dispara antes de que ese dato
-- exista). Ya está corregido en el código para altas nuevas — esto es
-- para reparar las que ya quedaron mal.
-- =====================================================================

-- 1) DIAGNÓSTICO: ver cuántos y cuáles perfiles están afectados (en TODOS
--    los tenants, por si hay más de uno). Ojo: esto incluye tanto a los
--    participantes demo como, si los hubiera, alumnos reales afectados.
select p.id, p.email, p.nombre, p.rol, p.tenant_id, u.raw_app_meta_data ->> 'tenant_id' as tenant_id_en_metadata
from profiles p
join auth.users u on u.id = p.id
where p.tenant_id is null
order by p.created_at;

-- 2) REPARACIÓN: para cada perfil con tenant_id null, copiar el tenant_id
--    que sí quedó bien guardado en el app_metadata del usuario (ese dato
--    está OK — el problema fue solo la lectura a tiempo por el trigger).
update profiles p
set tenant_id = (u.raw_app_meta_data ->> 'tenant_id')::uuid,
    rol = coalesce(p.rol, u.raw_app_meta_data ->> 'rol', 'participante')
from auth.users u
where u.id = p.id
  and p.tenant_id is null
  and u.raw_app_meta_data ->> 'tenant_id' is not null;

-- 3) Confirmar que ya no queda ninguno con tenant_id null que tenga el
--    dato disponible en metadata (si esto devuelve filas, son casos donde
--    ni siquiera el metadata tiene tenant_id — revisar a mano).
select p.id, p.email from profiles p
join auth.users u on u.id = p.id
where p.tenant_id is null;
