import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth";
import { renderMaterialPdf, type MaterialData } from "@/components/pdf/MaterialPdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getUserContext();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const supabase = createClient();

  // Solo alumnos con inscripción activa/completada pueden descargar el
  // material — RLS ya limita esto a "mi propia" inscripción.
  const { data: enroll } = await supabase
    .from("enrollments")
    .select("id, estado")
    .eq("course_id", params.id)
    .eq("user_id", user.userId)
    .maybeSingle();
  if (!enroll || enroll.estado === "cancelada") {
    return new NextResponse("Necesitás estar inscripto en este curso para descargar el material", { status: 403 });
  }

  const { data: curso } = await supabase
    .from("courses")
    .select("id, titulo, categoria, tenant_id")
    .eq("id", params.id)
    .single();
  if (!curso) return new NextResponse("Curso no encontrado", { status: 404 });

  const { data: branding } = await supabase
    .from("tenant_branding")
    .select("nombre_academia, logo_url, color_primario")
    .eq("tenant_id", curso.tenant_id)
    .single();

  const { data: mods } = await supabase
    .from("modules")
    .select("titulo, orden, lessons(titulo, orden, content_blocks(tipo, orden, contenido))")
    .eq("course_id", params.id)
    .order("orden");

  const modulos: MaterialData["modulos"] = (mods ?? []).map((m: any) => ({
    titulo: m.titulo,
    lessons: [...(m.lessons ?? [])]
      .sort((a: any, b: any) => a.orden - b.orden)
      .map((l: any) => ({
        titulo: l.titulo,
        blocks: [...(l.content_blocks ?? [])]
          .sort((a: any, b: any) => a.orden - b.orden)
          .map((b: any) => ({ tipo: b.tipo, contenido: b.contenido })),
      })),
  }));

  const data: MaterialData = {
    curso: curso.titulo,
    categoria: curso.categoria,
    academia: branding?.nombre_academia ?? "Academia",
    academia_logo: branding?.logo_url ?? null,
    color_primario: branding?.color_primario ?? null,
    modulos,
  };

  const pdf = await renderMaterialPdf(data);

  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="material-${params.id}.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
