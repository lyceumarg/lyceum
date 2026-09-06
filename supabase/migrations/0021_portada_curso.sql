-- =====================================================================
-- 0021_portada_curso.sql
-- portada_url ya existía en courses y en catalog_by_host desde el diseño
-- original, pero nunca se usó en ningún lado. Se agrega a
-- course_detail_public también, para mostrarla en el detalle del curso.
-- =====================================================================

drop function if exists public.course_detail_public(text, uuid);
create or replace function public.course_detail_public(p_host text, p_course uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'titulo', c.titulo, 'descripcion', c.descripcion,
    'precio', c.precio, 'moneda', c.moneda, 'categoria', c.categoria,
    'portada_url', c.portada_url,
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
