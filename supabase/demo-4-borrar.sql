-- =====================================================================
-- demo-4-borrar.sql
-- Corré esto cuando termines de mostrarle la demo a ABE, para dejar la
-- base limpia. Borra SOLO lo marcado como demo:
--   - Los cursos con título que empieza con "[DEMO]" (arrastra en cascada
--     módulos, lecciones, bloques, examen, preguntas, firmantes,
--     inscripciones, progreso, intentos y certificados de ESOS cursos).
--   - Las cuentas de participantes demo (dominio @demo-abe.com).
-- No toca ningún curso, capacitador ni participante real de ABE.
-- =====================================================================

delete from courses
where tenant_id = (select id from tenants where slug = 'abe')
  and titulo like '[DEMO]%';

delete from auth.users
where email like '%@demo-abe.com';

-- Si el capacitador "Dra. María López" lo creaste solo para la demo y no
-- lo usás en ningún curso real, podés borrarlo también (opcional, comentado
-- por seguridad — descomentar si corresponde):
-- delete from instructores
-- where tenant_id = (select id from tenants where slug = 'abe')
--   and nombre = 'Dra. María López'
--   and not exists (select 1 from courses where capacitador_id = instructores.id);
