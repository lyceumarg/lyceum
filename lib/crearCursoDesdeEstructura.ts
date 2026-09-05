import type { SupabaseClient } from "@supabase/supabase-js";

type BloqueGenerico =
  | { tipo: "richtext" | "destacado" | "caso_practico"; html: string }
  | { tipo: "imagen"; url: string }
  | { tipo: "quiz"; pregunta: string; opciones: string[]; correcta: number };

type LeccionGenerica = { titulo: string; blocks: BloqueGenerico[] };
type ModuloGenerico = { titulo: string; lessons: LeccionGenerica[] };

export async function crearCursoDesdeEstructura(
  supabase: SupabaseClient,
  tenantId: string,
  curso: { titulo: string; descripcion?: string; modulos: ModuloGenerico[] }
): Promise<{ courseId: string } | { error: string }> {
  const { data: courseRow, error: errCourse } = await supabase
    .from("courses")
    .insert({
      tenant_id: tenantId, titulo: curso.titulo, descripcion: curso.descripcion || null,
      precio: 0, estado: "borrador", emite_participacion: true, emite_certificacion: true,
    })
    .select("id")
    .single();
  if (errCourse || !courseRow) return { error: "No se pudo crear el curso: " + errCourse?.message };
  const courseId = courseRow.id as string;

  for (let mi = 0; mi < curso.modulos.length; mi++) {
    const m = curso.modulos[mi];
    const { data: modRow, error: errMod } = await supabase
      .from("modules")
      .insert({ tenant_id: tenantId, course_id: courseId, titulo: m.titulo, orden: mi })
      .select("id")
      .single();
    if (errMod || !modRow) continue;

    for (let li = 0; li < m.lessons.length; li++) {
      const l = m.lessons[li];
      const { data: lesRow, error: errLes } = await supabase
        .from("lessons")
        .insert({ tenant_id: tenantId, module_id: modRow.id, titulo: l.titulo, orden: li })
        .select("id")
        .single();
      if (errLes || !lesRow) continue;

      const filas = l.blocks.map((b, bi) => {
        if (b.tipo === "quiz") {
          return {
            tenant_id: tenantId, lesson_id: lesRow.id, tipo: "quiz", orden: bi,
            contenido: { pregunta: b.pregunta, opciones: b.opciones, correcta: b.correcta },
          };
        }
        if (b.tipo === "imagen") {
          return { tenant_id: tenantId, lesson_id: lesRow.id, tipo: "imagen", orden: bi, contenido: { url: b.url } };
        }
        return { tenant_id: tenantId, lesson_id: lesRow.id, tipo: b.tipo, orden: bi, contenido: { html: b.html } };
      });
      if (filas.length) await supabase.from("content_blocks").insert(filas);
    }
  }

  return { courseId };
}
