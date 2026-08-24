import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth";
import Player, { type Modulo } from "./Player";

export const metadata = { title: "Cursada" };

export default async function CursarPage({ params }: { params: { id: string } }) {
  const user = await getUserContext();
  if (!user) redirect("/login");

  const supabase = createClient();

  // Inscripción activa del usuario en este curso.
  const { data: enroll } = await supabase
    .from("enrollments")
    .select("id, estado")
    .eq("course_id", params.id)
    .eq("user_id", user.userId)
    .maybeSingle();
  if (!enroll) redirect(`/curso/${params.id}`);

  // Curso + estructura (RLS: bloques visibles por inscripción activa).
  const { data: curso } = await supabase
    .from("courses")
    .select("id, titulo, categoria")
    .eq("id", params.id)
    .single();

  const { data: mods } = await supabase
    .from("modules")
    .select("id, titulo, orden, lessons(id, titulo, orden, content_blocks(id, tipo, orden, contenido, media_url))")
    .eq("course_id", params.id)
    .order("orden");

  // Ordenar lecciones y bloques (el orden anidado se asegura acá).
  const modulos: Modulo[] = (mods ?? []).map((m: any) => ({
    id: m.id,
    titulo: m.titulo,
    lessons: [...(m.lessons ?? [])]
      .sort((a, b) => a.orden - b.orden)
      .map((l: any) => ({
        id: l.id,
        titulo: l.titulo,
        blocks: [...(l.content_blocks ?? [])].sort((a, b) => a.orden - b.orden),
      })),
  }));

  // Progreso: lecciones completadas de esta inscripción.
  const { data: prog } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completada")
    .eq("enrollment_id", enroll.id);
  const completadas = (prog ?? []).filter((p) => p.completada).map((p) => p.lesson_id);

  return (
    <Player
      courseId={params.id}
      enrollmentId={enroll.id}
      titulo={curso?.titulo ?? "Curso"}
      categoria={curso?.categoria ?? null}
      modulos={modulos}
      completadasIniciales={completadas}
    />
  );
}
