import { NextResponse, type NextRequest } from "next/server";
import mammoth from "mammoth";
import { createClient } from "@/lib/supabase/server";
import { getUserContext, isStaff } from "@/lib/auth";
import { parseCursoHtml } from "@/lib/importarCursoWord";
import { crearCursoDesdeEstructura } from "@/lib/crearCursoDesdeEstructura";

const STYLE_MAP = [
  "p[style-name='Title'] => h1.curso-titulo:fresh",
  "p[style-name='Heading 1'] => h2.modulo:fresh",
  "p[style-name='Heading 2'] => h3.leccion:fresh",
];

export async function POST(request: NextRequest) {
  const user = await getUserContext();
  if (!user || !isStaff(user.rol) || !user.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "El archivo tiene que ser un .docx (Word)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createClient();
  const tenantId = user.tenantId;

  // Cada imagen embebida en el Word se sube al mismo storage que ya usa el
  // bloque "Imagen" (en vez de quedar como base64 metida en el texto) — así
  // no infla la base y queda como un bloque de imagen real, no un párrafo
  // con una foto adentro.
  const convertImage = mammoth.images.imgElement(async (element: any) => {
    try {
      const imgBuffer: Buffer = await element.readAsBuffer();
      const ext = (element.contentType || "image/png").split("/")[1]?.replace("jpeg", "jpg") || "png";
      const path = `${tenantId}/import-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const up = await supabase.storage.from("contenido-curso").upload(path, imgBuffer, { contentType: element.contentType });
      if (up.error) return { src: "" };
      const url = supabase.storage.from("contenido-curso").getPublicUrl(path).data.publicUrl;
      return { src: url };
    } catch {
      return { src: "" };
    }
  });

  let html: string;
  try {
    const result = await mammoth.convertToHtml({ buffer }, { styleMap: STYLE_MAP, convertImage });
    html = result.value;
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo leer el archivo: " + e.message }, { status: 400 });
  }

  const curso = parseCursoHtml(html);
  if (!curso) {
    return NextResponse.json({
      error: "No encontré el título del curso. Usá el estilo \"Título\" de Word para el nombre del curso — revisá que estés usando la plantilla.",
    }, { status: 400 });
  }
  if (!curso.modulos.length) {
    return NextResponse.json({
      error: "No encontré ningún módulo con lecciones. Usá \"Título 1\" para los módulos y \"Título 2\" para las lecciones.",
    }, { status: 400 });
  }

  const resultado = await crearCursoDesdeEstructura(supabase, tenantId, curso);
  if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 500 });
  return NextResponse.json(resultado);
}
