import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderCertificatePdf, type CertData } from "@/components/pdf/CertificatePdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("verify_certificate", { p_id_publico: params.id });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return new NextResponse("Certificado no encontrado", { status: 404 });
  }

  const cert: CertData = {
    titular: row.titular,
    curso: row.curso,
    academia: row.academia,
    academia_logo: row.academia_logo,
    tipo: row.tipo,
    fecha_emision: row.fecha_emision,
    estado: row.estado,
    puntaje: row.puntaje,
    firmantes: row.firmantes ?? [],
    color_primario: row.color_primario,
    id_publico: params.id,
  };

  const pdf = await renderCertificatePdf(cert);

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-${params.id}.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
