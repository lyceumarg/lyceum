import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

export type BloquePptx =
  | { tipo: "richtext"; html: string }
  | { tipo: "destacado"; html: string }
  | { tipo: "caso_practico"; html: string }
  | { tipo: "imagen"; url: string }
  | { tipo: "quiz"; pregunta: string; opciones: string[]; correcta: number };

export type LeccionPptx = { titulo: string; blocks: BloquePptx[] };
export type ModuloPptx = { titulo: string; lessons: LeccionPptx[] };
export type CursoPptx = { titulo: string; modulos: ModuloPptx[] };

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });
const arr = (x: any): any[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

function textoDeParrafo(p: any): string {
  return arr(p["a:r"]).map((r) => (r["a:t"] ?? "")).join("").trim();
}

function esMarcador(titulo: string): { tipo: "destacado" | "caso_practico" | "pregunta" | null; resto: string } {
  const t = titulo.toUpperCase();
  if (t.startsWith("[DESTACADO]")) return { tipo: "destacado", resto: titulo.slice(11).trim() };
  if (t.startsWith("[CASO PRÁCTICO]")) return { tipo: "caso_practico", resto: titulo.slice(15).trim() };
  if (t.startsWith("[CASO PRACTICO]")) return { tipo: "caso_practico", resto: titulo.slice(15).trim() };
  if (t.startsWith("[PREGUNTA]")) return { tipo: "pregunta", resto: titulo.slice(10).trim() };
  return { tipo: null, resto: titulo };
}

export async function parseCursoPptx(
  buffer: Buffer,
  subirImagen: (bytes: Buffer, contentType: string) => Promise<string>
): Promise<CursoPptx | null> {
  const zip = await JSZip.loadAsync(buffer);

  async function readXml(path: string): Promise<any | null> {
    const f = zip.file(path);
    if (!f) return null;
    return xml.parse(await f.async("text"));
  }

  const pres = await readXml("ppt/presentation.xml");
  const presRelsRaw = await zip.file("ppt/_rels/presentation.xml.rels")!.async("text");
  const presRels = xml.parse(presRelsRaw);
  const relMap: Record<string, string> = {};
  for (const r of arr(presRels.Relationships.Relationship)) relMap[r["@_Id"]] = r["@_Target"];

  const sldIds = arr(pres["p:presentation"]["p:sldIdLst"]?.["p:sldId"]);
  const slidePaths = sldIds.map((s) => "ppt/" + relMap[s["@_r:id"]]).filter(Boolean);
  if (!slidePaths.length) return null;

  async function tipoDeLayout(slidePath: string): Promise<string | null> {
    const relsPath = slidePath.replace("slides/", "slides/_rels/") + ".rels";
    const relsFile = zip.file(relsPath);
    if (!relsFile) return null;
    const rels = xml.parse(await relsFile.async("text"));
    const layoutRel = arr(rels.Relationships.Relationship).find((r: any) => r["@_Type"].endsWith("/slideLayout"));
    if (!layoutRel) return null;
    const layoutPath = "ppt/slideLayouts/" + layoutRel["@_Target"].replace("../slideLayouts/", "");
    const layoutFile = zip.file(layoutPath);
    if (!layoutFile) return null;
    const layoutXml = xml.parse(await layoutFile.async("text"));
    return layoutXml["p:sldLayout"]?.["@_type"] ?? null;
  }

  async function imagenesDeSlide(slidePath: string, spTree: any): Promise<Record<string, string>> {
    // r:embed -> url ya subida a storage
    const pics = arr(spTree["p:pic"]);
    if (!pics.length) return {};
    const relsPath = slidePath.replace("slides/", "slides/_rels/") + ".rels";
    const relsFile = zip.file(relsPath);
    if (!relsFile) return {};
    const rels = xml.parse(await relsFile.async("text"));
    const relById: Record<string, string> = {};
    for (const r of arr(rels.Relationships.Relationship)) relById[r["@_Id"]] = r["@_Target"];

    const out: Record<string, string> = {};
    for (const pic of pics) {
      const rId = pic["p:blipFill"]?.["a:blip"]?.["@_r:embed"];
      if (!rId || !relById[rId]) continue;
      const mediaPath = "ppt/" + relById[rId].replace("../media/", "media/");
      const mediaFile = zip.file(mediaPath);
      if (!mediaFile) continue;
      const bytes = Buffer.from(await mediaFile.async("arraybuffer"));
      const ext = mediaPath.split(".").pop()?.toLowerCase() || "png";
      const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
      try {
        out[rId] = await subirImagen(bytes, contentType);
      } catch { /* si falla la subida de una imagen puntual, se sigue sin ella */ }
    }
    return out;
  }

  const modulos: ModuloPptx[] = [];
  let cursoTitulo: string | null = null;

  for (let i = 0; i < slidePaths.length; i++) {
    const slideData = await readXml(slidePaths[i]);
    if (!slideData) continue;
    const spTree = slideData["p:sld"]["p:cSld"]["p:spTree"];
    const shapes = arr(spTree["p:sp"]);

    let titulo = "";
    const bodyParrafos: string[] = [];
    let huboPlaceholderTitulo = false;
    for (const sp of shapes) {
      const ph = sp["p:nvSpPr"]?.["p:nvPr"]?.["p:ph"];
      const esTitulo = ph && (ph["@_type"] === "title" || ph["@_type"] === "ctrTitle");
      const parrafos = arr(sp["p:txBody"]?.["a:p"]).map(textoDeParrafo).filter(Boolean);
      if (esTitulo) {
        titulo = parrafos.join(" ").trim();
        huboPlaceholderTitulo = true;
      } else {
        bodyParrafos.push(...parrafos);
      }
    }

    // Sin placeholders reales (decks armados fuera de PowerPoint: Canva,
    // Google Slides, generadores automáticos) — se usa como título el texto
    // de mayor tamaño de fuente de la diapositiva, en vez de fallar.
    if (!huboPlaceholderTitulo && shapes.length) {
      let mejor: { texto: string; size: number } | null = null;
      const restoTextos: string[] = [];
      for (const sp of shapes) {
        const parrafos = arr(sp["p:txBody"]?.["a:p"]);
        for (const p of parrafos) {
          const texto = textoDeParrafo(p);
          if (!texto) continue;
          const tamanos = arr(p["a:r"]).map((r: any) => Number(r["a:rPr"]?.["@_sz"]) || 0);
          const maxSize = Math.max(0, ...tamanos);
          if (!mejor || maxSize > mejor.size) {
            if (mejor) restoTextos.push(mejor.texto);
            mejor = { texto, size: maxSize };
          } else {
            restoTextos.push(texto);
          }
        }
      }
      if (mejor) { titulo = mejor.texto; bodyParrafos.length = 0; bodyParrafos.push(...restoTextos); }
    }

    if (i === 0) {
      // la primera diapositiva define el nombre del curso, sea cual sea su layout
      cursoTitulo = titulo || null;
      continue;
    }

    const layoutTipo = await tipoDeLayout(slidePaths[i]);
    if (layoutTipo === "secHead") {
      modulos.push({ titulo: titulo || `Módulo ${modulos.length + 1}`, lessons: [] });
      continue;
    }

    if (!modulos.length) modulos.push({ titulo: "Módulo 1", lessons: [] });
    const modActual = modulos[modulos.length - 1];

    const { tipo: marcador, resto } = esMarcador(titulo);
    const leccionTitulo = resto || titulo || `Diapositiva ${i + 1}`;
    const blocks: BloquePptx[] = [];

    if (marcador === "pregunta") {
      const opciones = bodyParrafos.map((o) => o.replace(/^-\s*/, "").trim());
      let correcta = 0;
      const limpias = opciones.map((o, idx) => {
        if (/\(correcta\)\s*$/i.test(o)) { correcta = idx; return o.replace(/\(correcta\)\s*$/i, "").trim(); }
        return o;
      });
      if (limpias.length >= 2) blocks.push({ tipo: "quiz", pregunta: leccionTitulo, opciones: limpias, correcta });
    } else if (marcador === "destacado" || marcador === "caso_practico") {
      const html = bodyParrafos.map((p) => `<p>${p}</p>`).join("");
      blocks.push({ tipo: marcador, html: html || "<p></p>" });
    } else if (bodyParrafos.length) {
      blocks.push({ tipo: "richtext", html: bodyParrafos.map((p) => `<p>${p}</p>`).join("") });
    }

    const imgs = await imagenesDeSlide(slidePaths[i], spTree);
    for (const url of Object.values(imgs)) blocks.push({ tipo: "imagen", url });

    if (blocks.length) modActual.lessons.push({ titulo: leccionTitulo, blocks });
  }

  if (!cursoTitulo || !modulos.some((m) => m.lessons.length)) return null;
  return { titulo: cursoTitulo, modulos: modulos.filter((m) => m.lessons.length) };
}
