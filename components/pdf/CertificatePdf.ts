import { PDFDocument, StandardFonts, rgb, type PDFImage } from "pdf-lib";

export type CertData = {
  titular: string;
  curso: string;
  academia: string;
  academia_logo: string | null;
  tipo: string; // 'participacion' | 'certificacion'
  fecha_emision: string;
  estado: string;
  puntaje: number | null;
  firmantes: { nombre: string; cargo: string | null; firma_url: string | null }[];
  color_primario: string | null;
  id_publico: string;
};

function hexToRgb(hex: string | null) {
  const h = (hex || "#1f5c9c").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n, 16);
  if (isNaN(int)) return rgb(0.12, 0.36, 0.61);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

async function embedImage(pdf: PDFDocument, url: string | null): Promise<PDFImage | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("png") || url.toLowerCase().endsWith(".png")) return await pdf.embedPng(bytes);
    if (ct.includes("jpg") || ct.includes("jpeg")) return await pdf.embedJpg(bytes);
    try { return await pdf.embedPng(bytes); } catch { return await pdf.embedJpg(bytes); }
  } catch { return null; }
}

// Genera el certificado en PDF (A4 apaisado). Marca de la academia solamente.
export async function renderCertificatePdf(d: CertData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]); // A4 landscape (pt)
  const W = 842, H = 595;

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const timesBI = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
  const courier = await pdf.embedFont(StandardFonts.Courier);

  const brand = hexToRgb(d.color_primario);
  const ink = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.42, 0.42, 0.42);
  const esPart = d.tipo === "participacion";

  const center = (t: string, y: number, font = helv, size = 11, color = ink) => {
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (W - w) / 2, y, size, font, color });
  };

  // marcos
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: brand, borderWidth: 2 });
  page.drawRectangle({ x: 33, y: 33, width: W - 66, height: H - 66, borderColor: brand, borderWidth: 0.6 });

  // encabezado: logo (izq) + academia (der)
  const logo = await embedImage(pdf, d.academia_logo);
  if (logo) {
    const maxH = 40, maxW = 150;
    const sc = Math.min(maxH / logo.height, maxW / logo.width);
    page.drawImage(logo, { x: 58, y: H - 92, width: logo.width * sc, height: logo.height * sc });
  } else {
    page.drawText(d.academia, { x: 58, y: H - 78, size: 13, font: helvB, color: ink });
  }
  const acadW = helv.widthOfTextAtSize(d.academia.toUpperCase(), 9);
  page.drawText(d.academia.toUpperCase(), { x: W - 58 - acadW, y: H - 74, size: 9, font: helv, color: muted });

  // bloque central
  const tipoTxt = (esPart ? "CONSTANCIA DE PARTICIPACIÓN" : "CERTIFICADO");
  center(tipoTxt, H - 170, helvB, 22, brand);
  page.drawRectangle({ x: (W - 60) / 2, y: H - 188, width: 60, height: 3, color: brand });

  center("SE OTORGA LA PRESENTE A", H - 222, helv, 10, muted);
  center(d.titular, H - 262, timesBI, 32, ink);
  page.drawRectangle({ x: (W - 340) / 2, y: H - 276, width: 340, height: 0.8, color: rgb(0.85, 0.85, 0.85) });

  center(esPart ? "por haber participado en" : "por haber aprobado satisfactoriamente", H - 300, helv, 11, muted);

  // curso (envuelve si es largo)
  const curso = d.curso;
  const cSize = 16;
  if (helvB.widthOfTextAtSize(curso, cSize) <= W - 200) {
    center(curso, H - 328, helvB, cSize, ink);
  } else {
    const words = curso.split(" "); let line = "", lines: string[] = [];
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (helvB.widthOfTextAtSize(test, cSize) > W - 200) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((ln, i) => center(ln, H - 328 - i * 20, helvB, cSize, ink));
  }

  const fecha = new Date(d.fecha_emision).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const metaTxt = `Emitido el ${fecha}` + (!esPart && d.puntaje != null ? `   ·   Calificación: ${d.puntaje}%` : "");
  center(metaTxt, H - 372, helv, 9.5, muted);

  // pie: firmantes (hasta 2) + folio/verificación
  const firmantes = d.firmantes && d.firmantes.length ? d.firmantes.slice(0, 2) : [{ nombre: d.academia, cargo: "Entidad emisora", firma_url: null }];
  const slotW = 210, baseY = 78;
  const positions = firmantes.length === 1 ? [(W - slotW) / 2] : [96, 320];
  for (let i = 0; i < firmantes.length; i++) {
    const f = firmantes[i]; const cx = positions[i] + slotW / 2;
    const firma = await embedImage(pdf, f.firma_url);
    if (firma) {
      const sc = Math.min(30 / firma.height, 150 / firma.width);
      page.drawImage(firma, { x: cx - (firma.width * sc) / 2, y: baseY + 8, width: firma.width * sc, height: firma.height * sc });
    }
    page.drawRectangle({ x: cx - 85, y: baseY, width: 170, height: 0.8, color: rgb(0.72, 0.72, 0.72) });
    const nw = helvB.widthOfTextAtSize(f.nombre, 10);
    page.drawText(f.nombre, { x: cx - nw / 2, y: baseY - 14, size: 10, font: helvB, color: ink });
    if (f.cargo) {
      const cw = helv.widthOfTextAtSize(f.cargo, 8);
      page.drawText(f.cargo, { x: cx - cw / 2, y: baseY - 25, size: 8, font: helv, color: muted });
    }
  }

  // folio + verificación (derecha)
  const folioW = courier.widthOfTextAtSize(d.id_publico, 8.5);
  page.drawText(d.id_publico, { x: W - 70 - folioW, y: baseY - 2, size: 8.5, font: courier, color: muted });
  const vl = "VERIFICABLE EN LÍNEA";
  const vlW = helv.widthOfTextAtSize(vl, 7.5);
  page.drawText(vl, { x: W - 70 - vlW, y: baseY - 14, size: 7.5, font: helv, color: muted });

  return await pdf.save();
}
