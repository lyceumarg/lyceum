import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserContext, isStaff } from "@/lib/auth";
import { parseCursoPptx } from "@/lib/importarCursoPptx";
import { crearCursoDesdeEstructura } from "@/lib/crearCursoDesdeEstructura";

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
  if (!file.name.toLowerCase().endsWith(".pptx")) {
    return NextResponse.json({ error: "El archivo tiene que ser un .pptx (PowerPoint)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = createClient();
  const tenantId = user.tenantId;

  async function subirImagen(bytes: Buffer, contentType: string): Promise<string> {
    const ext = contentType.split("/")[1] || "png";
    const path = `${tenantId}/import-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await supabase.storage.from("contenido-curso").upload(path, bytes, { contentType });
    if (up.error) throw new Error(up.error.message);
    return supabase.storage.from("contenido-curso").getPublicUrl(path).data.publicUrl;
  }

  let curso;
  try {
    curso = await parseCursoPptx(buffer, subirImagen);
  } catch (e: any) {
    return NextResponse.json({ error: "No se pudo leer el archivo: " + e.message }, { status: 400 });
  }
  if (!curso) {
    return NextResponse.json({
      error: "No pude interpretar la presentación. Revisá que la primera diapositiva tenga un título, y que el resto tenga contenido.",
    }, { status: 400 });
  }

  const resultado = await crearCursoDesdeEstructura(supabase, tenantId, curso);
  if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 500 });
  return NextResponse.json(resultado);
}
