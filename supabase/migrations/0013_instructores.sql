-- =====================================================================
-- 0013_instructores.sql
-- Instructores/capacitadores: fichas de identidad (invitados, SIN login)
-- para dar crédito a quién dicta cada curso. Reutilizables entre cursos
-- del mismo tenant. Distinto de certificate_signers (quién firma/certifica).
-- =====================================================================

create table instructores (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  nombre      text not null,
  headline    text,               -- ej. "Especialista en PLAFTFP · ex-BCRA"
  bio         text,
  foto_url    text,
  linkedin_url text,
  created_at  timestamptz not null default now()
);
create index on instructores(tenant_id);

alter table courses add column if not exists capacitador_id uuid references instructores(id) on delete set null;

alter table instructores enable row level security;

-- Solo staff del tenant gestiona instructores (alta/edición/baja).
create policy instructores_manage on instructores for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_staff())
  with check (tenant_id = public.current_tenant_id() and public.is_tenant_staff());

-- Sin SELECT público directo: el catálogo/detalle exponen los datos del
-- instructor a través de las RPCs security definer (mismo patrón que
-- tenant_branding / certificate_signers).

-- ---------- Storage: fotos de instructores ----------
insert into storage.buckets (id, name, public)
values ('instructores', 'instructores', true)
on conflict (id) do nothing;

create policy instr_foto_lectura_publica on storage.objects for select
  using (bucket_id = 'instructores');
create policy instr_foto_escritura_staff on storage.objects for insert to authenticated
  with check (bucket_id = 'instructores' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy instr_foto_update_staff on storage.objects for update to authenticated
  using (bucket_id = 'instructores' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);
create policy instr_foto_delete_staff on storage.objects for delete to authenticated
  using (bucket_id = 'instructores' and public.is_tenant_staff()
    and (storage.foldername(name))[1] = public.current_tenant_id()::text);

-- ---------- Catálogo: sumar crédito compacto (nombre + foto) ----------
drop function if exists public.catalog_by_host(text);
create or replace function public.catalog_by_host(p_host text)
returns table (id uuid, titulo text, descripcion text, portada_url text,
               precio numeric, moneda text, categoria text, modulos bigint,
               instr_nombre text, instr_foto_url text)
language sql stable security definer set search_path = public as $$
  select c.id, c.titulo, c.descripcion, c.portada_url, c.precio, c.moneda, c.categoria,
         (select count(*) from modules m where m.course_id = c.id) as modulos,
         i.nombre, i.foto_url
  from tenant_domains d
  join courses c on c.tenant_id = d.tenant_id
  left join instructores i on i.id = c.capacitador_id
  where d.host = p_host and c.estado = 'publicado'
  order by c.created_at desc
$$;
grant execute on function public.catalog_by_host(text) to anon, authenticated;

-- ---------- Detalle: sumar ficha completa del instructor ----------
drop function if exists public.course_detail_public(text, uuid);
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
      from modules m where m.course_id = c.id), '[]'::jsonb),
    'capacitador', case when i.id is null then null else jsonb_build_object(
      'nombre', i.nombre, 'headline', i.headline, 'bio', i.bio,
      'foto_url', i.foto_url, 'linkedin_url', i.linkedin_url
    ) end
  )
  from tenant_domains d
  join courses c on c.tenant_id = d.tenant_id
  left join exam_config ec on ec.course_id = c.id
  left join instructores i on i.id = c.capacitador_id
  where d.host = p_host and c.id = p_course and c.estado = 'publicado'
$$;
grant execute on function public.course_detail_public(text,uuid) to anon, authenticated;
