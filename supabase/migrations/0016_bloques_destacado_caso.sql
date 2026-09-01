-- =====================================================================
-- 0016_bloques_destacado_caso.sql
-- Dos tipos de bloque nuevos para el contenido de las lecciones:
-- - destacado: recuadro sombreado para resaltar algo (ej. una advertencia
--   o un dato clave).
-- - caso_practico: recuadro para un caso de aplicación práctica.
-- Ambos guardan el mismo formato que "richtext" (contenido.html), solo
-- cambia cómo se renderizan.
-- =====================================================================

alter table content_blocks drop constraint if exists content_blocks_tipo_check;
alter table content_blocks add constraint content_blocks_tipo_check
  check (tipo in ('video','slides','richtext','download','link','embed','quiz','scorm','destacado','caso_practico'));
