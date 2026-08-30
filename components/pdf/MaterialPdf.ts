import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";

type Bloque = { tipo: string; contenido: any };
type Leccion = { titulo: string; blocks: Bloque[] };
type Modulo = { titulo: string; lessons: Leccion[] };

export type MaterialData = {
  curso: string;
  categoria: string | null;
  academia: string;
  academia_logo: string | null;
  color_primario: string | null;
  modulos: Modulo[];
};

const MARGIN = 56;
const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;

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

// Quita tags HTML del richtext y devuelve texto plano legible.
function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Envuelve texto a un ancho máximo, devolviendo líneas.
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) { lines.push(""); continue; }
    const words = paragraph.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function renderMaterialPdf(d: MaterialData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const brand = hexToRgb(d.color_primario);
  const ink = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.42, 0.42, 0.42);
  const line = rgb(0.85, 0.85, 0.85);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  let pageNum = 1;
  const contentW = PAGE_W - MARGIN * 2;

  function footer() {
    page.drawLine({ start: { x: MARGIN, y: 40 }, end: { x: PAGE_W - MARGIN, y: 40 }, thickness: 0.5, color: line });
    page.drawText(d.academia, { x: MARGIN, y: 26, size: 8, font: helv, color: muted });
    page.drawText("Powered by Lyceum", { x: PAGE_W - MARGIN - 90, y: 26, size: 8, font: helv, color: muted });
    page.drawText(String(pageNum), { x: PAGE_W / 2 - 4, y: 26, size: 8, font: helv, color: muted });
  }

  function newPage() {
    footer();
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pageNum++;
    y = PAGE_H - MARGIN;
  }

  function ensure(space: number) {
    if (y - space < 56) newPage();
  }

  function heading(text: string, size = 13, color = ink, gapBefore = 18, gapAfter = 8) {
    ensure(size + gapBefore + gapAfter);
    y -= gapBefore;
    page.drawText(text, { x: MARGIN, y, size, font: helvB, color });
    y -= gapAfter;
  }

  function paragraph(text: string, size = 10, color = ink, font: PDFFont = helv, indent = 0) {
    const lines = wrap(text, font, size, contentW - indent);
    for (const ln of lines) {
      ensure(size + 4);
      page.drawText(ln, { x: MARGIN + indent, y, size, font, color });
      y -= size + 4;
    }
  }

  // ---------- portada ----------
  const logo = await embedImage(pdf, d.academia_logo);
  if (logo) {
    const sc = Math.min(50 / logo.height, 200 / logo.width);
    page.drawImage(logo, { x: MARGIN, y: PAGE_H - MARGIN - 50, width: logo.width * sc, height: logo.height * sc });
  } else {
    page.drawText(d.academia, { x: MARGIN, y: PAGE_H - MARGIN - 20, size: 16, font: helvB, color: ink });
  }
  page.drawRectangle({ x: MARGIN, y: PAGE_H - MARGIN - 70, width: 50, height: 3, color: brand });
  page.drawText("MATERIAL DEL CURSO", { x: MARGIN, y: PAGE_H - MARGIN - 110, size: 10, font: mono, color: brand });
  y = PAGE_H - MARGIN - 150;
  const titleLines = wrap(d.curso, helvB, 24, contentW);
  for (const ln of titleLines) { page.drawText(ln, { x: MARGIN, y, size: 24, font: helvB, color: ink }); y -= 30; }
  if (d.categoria) {
    y -= 6;
    page.drawText(d.categoria, { x: MARGIN, y, size: 11, font: helv, color: muted });
    y -= 20;
  }
  const totalLecciones = d.modulos.reduce((s, m) => s + m.lessons.length, 0);
  page.drawText(`${d.modulos.length} módulos · ${totalLecciones} lecciones`, { x: MARGIN, y, size: 10, font: helv, color: muted });

  // índice
  y -= 50;
  page.drawText("CONTENIDO", { x: MARGIN, y, size: 10, font: mono, color: brand });
  y -= 20;
  d.modulos.forEach((m, i) => {
    ensure(16);
    page.drawText(`${String(i + 1).padStart(2, "0")}`, { x: MARGIN, y, size: 10, font: mono, color: brand });
    page.drawText(m.titulo, { x: MARGIN + 30, y, size: 11, font: helv, color: ink });
    y -= 18;
  });

  // ---------- contenido por módulo/lección ----------
  d.modulos.forEach((m, mi) => {
    newPage();
    heading(`MÓDULO ${mi + 1}`, 9, brand, 0, 4);
    heading(m.titulo, 17, ink, 14, 16);

    m.lessons.forEach((l, li) => {
      ensure(40);
      heading(`${mi + 1}.${li + 1}  ${l.titulo}`, 12.5, ink, 16, 12);

      l.blocks.forEach((b) => {
        const c = b.contenido || {};
        if (b.tipo === "richtext" && c.html) {
          paragraph(htmlToText(c.html), 10, ink);
          y -= 4;
        } else if (["video", "slides", "embed"].includes(b.tipo)) {
          paragraph(`[VIDEO] ${c.titulo || "Recurso multimedia"}${c.proveedor ? " · " + c.proveedor : ""}`, 10, brand, helvB);
          if (c.url) paragraph(c.url, 9, muted, mono, 14);
          y -= 4;
        } else if (b.tipo === "link") {
          paragraph(`[ENLACE] ${c.titulo || "Enlace"}${c.fuente ? " · " + c.fuente : ""}`, 10, brand, helvB);
          if (c.url) paragraph(c.url, 9, muted, mono, 14);
          y -= 4;
        } else if (b.tipo === "download") {
          paragraph(`[ARCHIVO] ${c.nombre || "Descargable"}${c.tipo_archivo ? " (" + c.tipo_archivo + ")" : ""}`, 10, brand, helvB);
          if (c.url && c.url !== "#") paragraph(c.url, 9, muted, mono, 14);
          y -= 4;
        } else if (b.tipo === "quiz") {
          paragraph(`Ejercicio de repaso: ${c.pregunta || ""}`, 10, muted);
          y -= 4;
        }
      });
    });
  });

  footer();
  return await pdf.save();
}
