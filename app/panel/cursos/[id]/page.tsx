import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth";
import CourseEditor, { type EditorData } from "@/components/panel/CourseEditor";

export const metadata = { title: "Editor de curso" };

export default async function EditorPage({ params }: { params: { id: string } }) {
  const user = await getUserContext();
  if (!user) redirect("/login");
  const supabase = createClient();

  // Ninguna de estas 7 consultas depende del resultado de las demás — antes
  // se pedían una atrás de la otra (await secuencial) y el tiempo de espera
  // de cada una se sumaba. Disparándolas todas juntas, la carga total tarda
  // lo que tarda la MÁS LENTA de las 7, no la suma de las 7.
  const [
    { data: course },
    { data: mods },
    { data: cfg },
    { data: preguntas },
    { data: signers },
    { data: instructores },
    { data: categorias },
    { data: inscriptos },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, titulo, descripcion, categoria, precio, estado, emite_participacion, emite_certificacion, capacitador_id")
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("modules")
      .select("id, titulo, orden, lessons(id, titulo, orden, content_blocks(id, tipo, orden, contenido, media_url))")
      .eq("course_id", params.id),
    supabase
      .from("exam_config")
      .select("cant_preguntas, nota_corte, max_intentos")
      .eq("course_id", params.id)
      .maybeSingle(),
    supabase
      .from("questions")
      .select("id, enunciado, explicacion, question_options(id, texto, es_correcta)")
      .eq("course_id", params.id),
    supabase
      .from("certificate_signers")
      .select("id, nombre, cargo, firma_url, orden")
      .eq("course_id", params.id)
      .order("orden"),
    // Instructores del tenant (para el selector) — reutilizables entre cursos.
    supabase
      .from("instructores")
      .select("id, nombre, headline, bio, foto_url, linkedin_url")
      .eq("tenant_id", user.tenantId)
      .order("created_at", { ascending: false }),
    supabase
      .from("categorias")
      .select("id, nombre")
      .eq("tenant_id", user.tenantId)
      .order("nombre"),
    supabase
      .from("enrollments")
      .select("id, estado, origen, fecha_inscripcion, cortesia, profiles(nombre, email)")
      .eq("course_id", params.id)
      .order("fecha_inscripcion", { ascending: false }),
  ]);

  if (!course) notFound();

  const modulos = (mods ?? [])
    .sort((a, b) => a.orden - b.orden)
    .map((m: any) => ({
      id: m.id,
      titulo: m.titulo,
      orden: m.orden,
      lessons: [...(m.lessons ?? [])].sort((a, b) => a.orden - b.orden).map((l: any) => ({
        id: l.id,
        titulo: l.titulo,
        orden: l.orden,
        blocks: [...(l.content_blocks ?? [])].sort((a, b) => a.orden - b.orden),
      })),
    }));

  const data: EditorData = {
    course,
    tenantId: user.tenantId!,
    modulos,
    examCfg: cfg ?? { cant_preguntas: 10, nota_corte: 70, max_intentos: 3 },
    signers: (signers ?? []) as any,
    instructores: (instructores ?? []) as any,
    categorias: (categorias ?? []) as any,
    inscriptos: (inscriptos ?? []) as any,
    preguntas: (preguntas ?? []).map((q: any) => ({
      id: q.id,
      enunciado: q.enunciado,
      explicacion: q.explicacion,
      options: q.question_options ?? [],
    })),
  };

  return (
    <>
      <Link href="/panel" className="back">← Volver a cursos</Link>
      <CourseEditor data={data} />
    </>
  );
}
