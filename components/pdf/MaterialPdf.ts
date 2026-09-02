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
const BOTTOM = 64; // límite inferior de contenido, antes del footer

function hexToRgb(hex: string | null) {
  const { r, g, b } = hexToRgbParts(hex);
  return rgb(r, g, b);
}
function hexToRgbParts(hex: string | null): { r: number; g: number; b: number } {
  const h = (hex || "#1f5c9c").replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n, 16);
  if (isNaN(int)) return { r: 0.12, g: 0.36, b: 0.61 };
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
}
function mix(c: { r: number; g: number; b: number }, toward: number, amount: number) {
  return rgb(c.r + (toward - c.r) * amount, c.g + (toward - c.g) * amount, c.b + (toward - c.b) * amount);
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

// Quita tags HTML y devuelve texto plano legible. Los <ol><li> se numeran
// ANTES de la limpieza genérica — si no, toda lista (numerada o no) termina
// como una viñeta y se pierde el orden real (1, 2, 3…).
function htmlToText(html: string): string {
  let out = html.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_all: string, inner: string) => {
    let n = 0;
    return String(inner).replace(/<li[^>]*>/gi, () => `§NUM§${++n}. `);
  });
  return out
    .replace(/<\/(p|div|h[1-6])>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/§NUM§/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Envuelve texto a un ancho máximo. Devuelve los "párrafos" (separados por
// \n) ya divididos en líneas, para poder justificar todas las líneas de un
// párrafo MENOS la última (regla tipográfica estándar).
function wrapParagraphs(text: string, font: PDFFont, size: number, maxWidth: number): string[][] {
  return text.split("\n").map((paragraph) => {
    if (!paragraph) return [""];
    const words = paragraph.split(" ");
    const lines: string[] = [];
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
    return lines;
  });
}

function esListaOTitulo(paragraph: string): boolean {
  return /^(•|\d+\.)\s/.test(paragraph.trim()) || paragraph.length < 4;
}

export async function renderMaterialPdf(d: MaterialData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvB = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  const brand = hexToRgb(d.color_primario);
  const brandParts = hexToRgbParts(d.color_primario);
  const brandBg = mix(brandParts, 1, 0.9);
  const caso = rgb(0.69, 0.5, 0.14);
  const casoBg = rgb(0.98, 0.95, 0.89);
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

  // Solo corta página cuando el contenido realmente no entra — nunca "a la
  // fuerza" al empezar un módulo (eso dejaba páginas casi vacías).
  function ensure(space: number) {
    if (y - space < BOTTOM) newPage();
  }

  function heading(text: string, size = 13, color = ink, gapBefore = 18, gapAfter = 8) {
    ensure(size + gapBefore + gapAfter);
    y -= gapBefore;
    page.drawText(text, { x: MARGIN, y, size, font: helvB, color });
    y -= gapAfter;
  }

  // Dibuja una línea, justificada (repartiendo el espacio extra entre
  // palabras) salvo que sea la última línea de su párrafo, un ítem de lista,
  // o un título corto — ahí se ve mejor sin forzar el ancho.
  function drawLine(ln: string, x: number, size: number, color: any, font: PDFFont, justify: boolean, targetW: number) {
    if (!justify) { page.drawText(ln, { x, y, size, font, color }); return; }
    const words = ln.split(" ");
    if (words.length < 2) { page.drawText(ln, { x, y, size, font, color }); return; }
    const natural = font.widthOfTextAtSize(ln, size);
    const extra = Math.max(0, targetW - natural);
    const gap = extra / (words.length - 1);
    const spaceW = font.widthOfTextAtSize(" ", size);
    let cx = x;
    words.forEach((w, i) => {
      page.drawText(w, { x: cx, y, size, font, color });
      cx += font.widthOfTextAtSize(w, size) + spaceW + (i < words.length - 1 ? gap : 0);
    });
  }

  function paragraph(text: string, size = 10, color = ink, font: PDFFont = helv, indent = 0, lineHeightMul = 1.5) {
    const targetW = contentW - indent;
    const paragraphs = wrapParagraphs(text, font, size, targetW);
    const lh = size * lineHeightMul;
    paragraphs.forEach((lines, pi) => {
      const isListOrShort = esListaOTitulo(text.split("\n")[pi] || "");
      lines.forEach((ln, li) => {
        ensure(lh);
        const isLast = li === lines.length - 1;
        drawLine(ln, MARGIN + indent, size, color, font, !isLast && !isListOrShort, targetW);
        y -= lh;
      });
      if (pi < paragraphs.length - 1) y -= size * 0.35; // respiro entre párrafos
    });
  }

  // Recuadro con barra de color a la izquierda (Destacado / Caso práctico).
  async function callout(text: string, accent: any, bg: any, label?: string) {
    const pad = 12, indent = pad + 8;
    const size = 10, lh = size * 1.5;
    const targetW = contentW - indent - pad;
    const paragraphs = wrapParagraphs(text, helv, size, targetW);
    let h = pad * 2 + (label ? 16 : 0);
    paragraphs.forEach((lines, pi) => { h += lines.length * lh; if (pi < paragraphs.length - 1) h += size * 0.35; });
    ensure(h + 10);
    const top = y;
    page.drawRectangle({ x: MARGIN, y: top - h, width: contentW, height: h, color: bg });
    page.drawRectangle({ x: MARGIN, y: top - h, width: 3, height: h, color: accent });
    y = top - pad;
    if (label) {
      page.drawText(label, { x: MARGIN + indent, y: y - 8, size: 8.5, font: helvB, color: accent });
      y -= 16;
    }
    paragraphs.forEach((lines, pi) => {
      const isListOrShort = esListaOTitulo(text.split("\n")[pi] || "");
      lines.forEach((ln, li) => {
        const isLast = li === lines.length - 1;
        drawLine(ln, MARGIN + indent, size, ink, helv, !isLast && !isListOrShort, targetW);
        y -= lh;
      });
      if (pi < paragraphs.length - 1) y -= size * 0.35;
    });
    y = top - h - 14;
  }

  async function imageBlock(url: string, caption: string | null) {
    const img = await embedImage(pdf, url);
    if (!img) { paragraph("(No se pudo cargar la imagen)", 9, muted); return; }
    const maxH = 260;
    const scale = Math.min(contentW / img.width, maxH / img.height, 1);
    const w = img.width * scale, h = img.height * scale;
    ensure(h + (caption ? 20 : 10) + 10);
    const x = MARGIN + (contentW - w) / 2;
    page.drawImage(img, { x, y: y - h, width: w, height: h });
    y -= h + 16;
    if (caption) {
      page.drawText(caption, { x: MARGIN, y, size: 9, font: helv, color: muted });
      y -= 16;
    }
    y -= 8;
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
  const titleLines = wrapParagraphs(d.curso, helvB, 24, contentW)[0];
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

  // ---------- contenido por módulo/lección (flujo continuo — sin salto
  // de página forzado en cada módulo; solo corta cuando de verdad no entra) ----------
  newPage();
  for (const [mi, m] of d.modulos.entries()) {
    heading(`MÓDULO ${mi + 1}`, 9, brand, mi === 0 ? 0 : 26, 4);
    heading(m.titulo, 17, ink, 14, 16);

    for (const [li, l] of m.lessons.entries()) {
      heading(`${mi + 1}.${li + 1}  ${l.titulo}`, 12.5, ink, 16, 22);

      for (const b of l.blocks) {
        const c = b.contenido || {};
        if (b.tipo === "richtext" && c.html) {
          paragraph(htmlToText(c.html), 10, ink);
          y -= 4;
        } else if (b.tipo === "destacado" && c.html) {
          await callout(htmlToText(c.html), brand, brandBg);
        } else if (b.tipo === "caso_practico" && c.html) {
          await callout(htmlToText(c.html), caso, casoBg, "CASO PRÁCTICO");
        } else if (b.tipo === "imagen" && c.url) {
          await imageBlock(c.url, c.titulo || null);
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
      }
    }
  }

  footer();
  return await pdf.save();
}
