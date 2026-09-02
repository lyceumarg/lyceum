import { NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, AlignmentType, ImageRun, Header, BorderStyle,
} from "docx";
import { createClient } from "@/lib/supabase/server";
import { getUserContext, isStaff } from "@/lib/auth";

export const runtime = "nodejs";

const COLS = [
  { key: "alumno", label: "Alumno", w: 2200 },
  { key: "curso", label: "Curso", w: 2600 },
  { key: "estado", label: "Estado", w: 1200 },
  { key: "origen", label: "Origen", w: 1200 },
  { key: "avance", label: "Avance", w: 900 },
  { key: "finalizacion", label: "Finalización", w: 1200 },
  { key: "puntaje", label: "Puntaje", w: 900 },
];
const TABLE_W = COLS.reduce((s, c) => s + c.w, 0);

const ORIGEN_LABEL: Record<string, string> = {
  compra: "Mercado Pago", manual: "Online", masivo: "Manual", cupo: "Cupo",
};
const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa", completada: "Completada", cancelada: "Cancelada",
};

function celda(text: string, width: number, opts: { bold?: boolean; header?: boolean } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: "15171E" } : undefined,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [new Paragraph({
      children: [new TextRun({ text, bold: opts.bold || opts.header, color: opts.header ? "FFFFFF" : undefined, size: 18 })],
    })],
  });
}

export async function GET() {
  const user = await getUserContext();
  if (!user || !isStaff(user.rol) || !user.tenantId) {
    return new NextResponse("No autorizado", { status: 403 });
  }

  const supabase = createClient();
  const [{ data: filas }, { data: branding }] = await Promise.all([
    supabase.rpc("participantes_con_avance"),
    supabase.from("tenant_branding").select("nombre_academia, logo_url").eq("tenant_id", user.tenantId).maybeSingle(),
  ]);

  const academia = branding?.nombre_academia ?? "Academia";
  const fechaConsulta = new Date().toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" });

  let logoImg: ImageRun | null = null;
  if (branding?.logo_url) {
    try {
      const res = await fetch(branding.logo_url);
      if (res.ok) {
        const buf = new Uint8Array(await res.arrayBuffer());
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        logoImg = new ImageRun({
          type: ct.includes("png") ? "png" : "jpg",
          data: buf,
          transformation: { width: 42, height: 42 },
        });
      }
    } catch { /* si falla la carga del logo, el reporte sigue sin él */ }
  }

  const filasOk = (filas ?? []) as any[];

  const headerRow = new TableRow({
    tableHeader: true,
    children: COLS.map((c) => celda(c.label, c.w, { header: true })),
  });
  const rows = filasOk.map((f) => new TableRow({
    children: [
      celda(f.alumno_nombre || f.alumno_email || "—", COLS[0].w),
      celda(f.curso_titulo || "—", COLS[1].w),
      celda(ESTADO_LABEL[f.estado] ?? f.estado, COLS[2].w),
      celda(ORIGEN_LABEL[f.origen] ?? f.origen, COLS[3].w),
      celda(`${f.avance_pct ?? 0}%`, COLS[4].w),
      celda(f.cert_fecha ? new Date(f.cert_fecha).toLocaleDateString("es-AR") : "—", COLS[5].w),
      celda(f.cert_puntaje != null ? `${f.cert_puntaje}%` : "—", COLS[6].w),
    ],
  }));

  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              ...(logoImg ? [logoImg, new TextRun({ text: "   " })] : []),
              new TextRun({ text: academia, bold: true, size: 20 }),
            ],
          })],
        }),
      },
      children: [
        new Paragraph({ children: [new TextRun({ text: "Reporte de participantes", bold: true, size: 32 })], spacing: { after: 80 } }),
        new Paragraph({
          children: [new TextRun({ text: `Fecha de consulta: ${fechaConsulta}`, italics: true, size: 18, color: "606377" })],
          spacing: { after: 300 },
        }),
        new Table({
          width: { size: TABLE_W, type: WidthType.DXA },
          columnWidths: COLS.map((c) => c.w),
          rows: [headerRow, ...rows],
        }),
        new Paragraph({
          children: [new TextRun({ text: `${filasOk.length} participante(s) · Powered by Lyceum`, italics: true, size: 16, color: "8A8DA0" })],
          spacing: { before: 300 },
        }),
      ],
    }],
  });

  const buf = await Packer.toBuffer(doc);
  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="participantes.docx"`,
    },
  });
}
