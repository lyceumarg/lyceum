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

  const { data: course } = await supabase
    .from("courses")
    .select("id, titulo, descripcion, categoria, precio, estado, emite_participacion, emite_certificacion, capacitador_id")
    .eq("id", params.id)
    .maybeSingle();
  if (!course) notFound();

  const { data: mods } = await supabase
    .from("modules")
    .select("id, titulo, orden, lessons(id, titulo, orden, content_blocks(id, tipo, orden, contenido, media_url))")
    .eq("course_id", params.id);

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

  const { data: cfg } = await supabase
    .from("exam_config")
    .select("cant_preguntas, nota_corte, max_intentos")
    .eq("course_id", params.id)
    .maybeSingle();

  const { data: preguntas } = await supabase
    .from("questions")
    .select("id, enunciado, explicacion, question_options(id, texto, es_correcta)")
    .eq("course_id", params.id);

  const { data: signers } = await supabase
    .from("certificate_signers")
    .select("id, nombre, cargo, firma_url, orden")
    .eq("course_id", params.id)
    .order("orden");

  // Instructores del tenant (para el selector) — reutilizables entre cursos.
  const { data: instructores } = await supabase
    .from("instructores")
    .select("id, nombre, headline, bio, foto_url, linkedin_url")
    .eq("tenant_id", user.tenantId)
    .order("created_at", { ascending: false });

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("tenant_id", user.tenantId)
    .order("nombre");

  const data: EditorData = {
    course,
    tenantId: user.tenantId!,
    modulos,
    examCfg: cfg ?? { cant_preguntas: 10, nota_corte: 70, max_intentos: 3 },
    signers: (signers ?? []) as any,
    instructores: (instructores ?? []) as any,
    categorias: (categorias ?? []) as any,
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
