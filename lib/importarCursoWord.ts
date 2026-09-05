// Convierte el .docx de la plantilla (ya pasado por mammoth con el styleMap de
// importar-word/route.ts) en la estructura de módulos/lecciones/bloques de
// Lyceum. Todo lo que hay ANTES del primer <h1 class="curso-titulo"> se
// ignora a propósito — es donde vive la página de instrucciones de la
// plantilla.

export type BloqueImportado =
  | { tipo: "richtext"; html: string }
  | { tipo: "destacado"; html: string }
  | { tipo: "caso_practico"; html: string }
  | { tipo: "imagen"; url: string }
  | { tipo: "quiz"; pregunta: string; opciones: string[]; correcta: number };

export type LeccionImportada = { titulo: string; blocks: BloqueImportado[] };
export type ModuloImportado = { titulo: string; lessons: LeccionImportada[] };
export type CursoImportado = { titulo: string; descripcion: string; modulos: ModuloImportado[] };

function plano(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

const MARCADORES = ["[DESTACADO]", "[CASO PRÁCTICO]", "[CASO PRACTICO]", "[PREGUNTA]"] as const;

export function parseCursoHtml(html: string): CursoImportado | null {
  // separar en elementos de bloque, en orden
  const els = html.match(/<h1[^>]*>.*?<\/h1>|<h2[^>]*>.*?<\/h2>|<h3[^>]*>.*?<\/h3>|<p[^>]*>.*?<\/p>|<ul[^>]*>.*?<\/ul>|<ol[^>]*>.*?<\/ol>/gs) ?? [];

  const tituloIdx = els.findIndex((e) => /^<h1 class="curso-titulo"/.test(e));
  if (tituloIdx === -1) return null; // no tiene el título del curso con el estilo "Título" — probablemente no siguieron la plantilla

  const titulo = plano(els[tituloIdx]);
  const modulos: ModuloImportado[] = [];
  let descripcion = "";
  let curLeccion: LeccionImportada | null = null;
  let curRichtext: string[] = [];
  let leyoDescripcion = false;

  function flushRichtext() {
    if (curRichtext.length && curLeccion) {
      curLeccion.blocks.push({ tipo: "richtext", html: curRichtext.join("") });
    }
    curRichtext = [];
  }
  function flushLeccion() {
    flushRichtext();
    if (curLeccion && modulos.length) modulos[modulos.length - 1].lessons.push(curLeccion);
    curLeccion = null;
  }

  for (let i = tituloIdx + 1; i < els.length; i++) {
    const el = els[i];
    if (/^<h2 class="modulo"/.test(el)) {
      flushLeccion();
      modulos.push({ titulo: plano(el), lessons: [] });
      continue;
    }
    if (/^<h3 class="leccion"/.test(el)) {
      flushLeccion();
      curLeccion = { titulo: plano(el), blocks: [] };
      continue;
    }
    if (!modulos.length) {
      // párrafos entre el título del curso y el primer módulo = descripción
      if (/^<p/.test(el) && !leyoDescripcion) descripcion += (descripcion ? " " : "") + plano(el);
      continue;
    }
    leyoDescripcion = true;
    if (!curLeccion) continue; // texto suelto sin lección todavía (no debería pasar si siguieron la plantilla)

    const texto = plano(el);

    // un párrafo cuyo único contenido es una imagen (patrón típico de Word:
    // la figura sola en su propia línea) se separa como bloque "Imagen"
    // propio, en vez de quedar embebida dentro del texto.
    if (/^<p/.test(el)) {
      const imgMatch = el.match(/<img[^>]*src="([^"]+)"[^>]*>/);
      if (imgMatch && !texto) {
        flushRichtext();
        curLeccion.blocks.push({ tipo: "imagen", url: imgMatch[1] });
        continue;
      }
    }

    const marcador = MARCADORES.find((m) => texto.toUpperCase().startsWith(m));

    if (marcador === "[DESTACADO]") {
      flushRichtext();
      curLeccion.blocks.push({ tipo: "destacado", html: `<p>${texto.slice(marcador.length).trim()}</p>` });
    } else if (marcador === "[CASO PRÁCTICO]" || marcador === "[CASO PRACTICO]") {
      flushRichtext();
      curLeccion.blocks.push({ tipo: "caso_practico", html: `<p>${texto.slice(marcador.length).trim()}</p>` });
    } else if (marcador === "[PREGUNTA]") {
      flushRichtext();
      const pregunta = texto.slice(marcador.length).trim();
      const opciones: string[] = [];
      let correcta = 0;
      let j = i + 1;
      while (j < els.length && /^<p/.test(els[j]) && plano(els[j]).trim().startsWith("-")) {
        let opt = plano(els[j]).replace(/^-\s*/, "").trim();
        if (/\(correcta\)\s*$/i.test(opt)) {
          correcta = opciones.length;
          opt = opt.replace(/\(correcta\)\s*$/i, "").trim();
        }
        opciones.push(opt);
        j++;
      }
      if (opciones.length >= 2) curLeccion.blocks.push({ tipo: "quiz", pregunta, opciones, correcta });
      i = j - 1;
    } else if (/^<(p|ul|ol)/.test(el)) {
      curRichtext.push(el);
    }
  }
  flushLeccion();

  return { titulo, descripcion, modulos: modulos.filter((m) => m.lessons.length) };
}
