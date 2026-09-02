"use client";
import { useState } from "react";

export type Block = {
  id: string;
  tipo: "video" | "slides" | "richtext" | "download" | "link" | "embed" | "quiz" | "scorm" | "destacado" | "caso_practico" | "imagen";
  contenido: Record<string, any>;
  media_url?: string | null;
};

const NOMBRE: Record<Block["tipo"], string> = {
  video: "Video", slides: "Presentación", richtext: "Texto", download: "Descargable",
  link: "Enlace externo", embed: "Embed", quiz: "Quiz", scorm: "SCORM",
  destacado: "Destacado", caso_practico: "Caso práctico", imagen: "Imagen",
};

function pick(c: Record<string, any>, ...keys: string[]) {
  for (const k of keys) if (c?.[k] != null) return c[k];
  return undefined;
}

// Detecta YouTube/Vimeo en la URL y arma el link de embed real. Si no
// reconoce el proveedor (u otro tipo de link), devuelve null — ahí se
// muestra el placeholder con el link "Abrir ↗" como respaldo.
function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default function BlockView({ b }: { b: Block }) {
  const c = b.contenido ?? {};
  const url = pick(c, "url") ?? b.media_url ?? undefined;

  let inner: React.ReactNode = null;

  if (b.tipo === "video") {
    const titulo = pick(c, "titulo", "title") ?? "Video";
    const emb = url ? embedUrl(url) : null;
    inner = emb ? (
      <div className="blk-video-wrap">
        <iframe src={emb} title={titulo} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    ) : (
      <div className="blk-stage">
        <div className="blk-type">VIDEO</div>
        <div style={{ textAlign: "center" }}>
          <div className="blk-play">▶</div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#cfe0d8" }}>{titulo}</div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, color: "#e9ddc2", fontSize: 12, textDecoration: "underline" }}>
              Abrir video ↗
            </a>
          )}
        </div>
      </div>
    );
  } else if (b.tipo === "slides") {
    const titulo = pick(c, "titulo", "title") ?? "Presentación";
    const esPdf = (pick(c, "tipo_archivo") ?? "").toLowerCase() === "pdf" || (url ?? "").toLowerCase().endsWith(".pdf");
    const src = url ? (esPdf ? url : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`) : null;
    inner = src ? (
      <div className="blk-slides-wrap">
        <iframe src={src} title={titulo} />
      </div>
    ) : (
      <div className="blk-stage">
        <div className="blk-type">PRESENTACIÓN</div>
        <div style={{ textAlign: "center" }}>
          <div className="blk-play">▶</div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#cfe0d8" }}>{titulo}</div>
        </div>
      </div>
    );
  } else if (["embed", "scorm"].includes(b.tipo)) {
    const label = NOMBRE[b.tipo];
    const titulo = pick(c, "titulo", "title") ?? label;
    const prov = pick(c, "proveedor", "provider");
    inner = (
      <div className="blk-stage">
        <div className="blk-type">{label.toUpperCase()}{prov ? ` · ${String(prov).toUpperCase()}` : ""}</div>
        <div style={{ textAlign: "center" }}>
          <div className="blk-play">▶</div>
          <div style={{ marginTop: 12, fontSize: 13, color: "#cfe0d8" }}>{titulo}</div>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 6, color: "#e9ddc2", fontSize: 12, textDecoration: "underline" }}>
              Abrir {label.toLowerCase()} ↗
            </a>
          )}
        </div>
      </div>
    );
  } else if (b.tipo === "richtext") {
    inner = <div className="blk-rich" dangerouslySetInnerHTML={{ __html: pick(c, "html") ?? "<p>(sin contenido)</p>" }} />;
  } else if (b.tipo === "destacado") {
    inner = (
      <div className="blk-rich blk-destacado">
        <div dangerouslySetInnerHTML={{ __html: pick(c, "html") ?? "<p>(sin contenido)</p>" }} />
      </div>
    );
  } else if (b.tipo === "caso_practico") {
    inner = (
      <div className="blk-rich blk-caso">
        <div className="blk-caso-tag">Caso práctico</div>
        <div dangerouslySetInnerHTML={{ __html: pick(c, "html") ?? "<p>(sin contenido)</p>" }} />
      </div>
    );
  } else if (b.tipo === "imagen") {
    inner = (
      <figure style={{ margin: 0 }}>
        {url ? (
          <img src={url} alt={pick(c, "alt", "titulo") ?? ""} style={{ width: "100%", borderRadius: "var(--radius)", display: "block" }} />
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 13 }}>(sin imagen)</div>
        )}
        {pick(c, "titulo") && (
          <figcaption style={{ marginTop: 8, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>{pick(c, "titulo")}</figcaption>
        )}
      </figure>
    );
  } else if (b.tipo === "link") {
    inner = (
      <a className="blk-file" href={url ?? "#"} target="_blank" rel="noopener noreferrer">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{pick(c, "titulo", "title") ?? "Enlace externo"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{pick(c, "fuente", "source") ?? url}</div>
        </div>
        <span className="pill">Abrir ↗</span>
      </a>
    );
  } else if (b.tipo === "download") {
    inner = (
      <div className="blk-file">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{pick(c, "nombre", "name") ?? "Material descargable"}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>{pick(c, "tipo_archivo", "fileType") ?? "PDF"}</div>
        </div>
        <a className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} href={url ?? "#"} target="_blank" rel="noopener noreferrer">
          Descargar
        </a>
      </div>
    );
  } else if (b.tipo === "quiz") {
    inner = <Quiz c={c} />;
  }

  return (
    <div style={{ marginTop: 20 }}>
      {!["richtext", "destacado", "caso_practico", "imagen"].includes(b.tipo) && (
        <div className="blk-label">{NOMBRE[b.tipo]}</div>
      )}
      {inner}
    </div>
  );
}

function Quiz({ c }: { c: Record<string, any> }) {
  const pregunta = pick(c, "pregunta", "question") ?? "Pregunta";
  const opciones: string[] = pick(c, "opciones", "options") ?? [];
  const correcta: number = pick(c, "correcta", "answerIndex") ?? -1;
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div className="blk-quiz">
      <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 12 }}>{pregunta}</div>
      {opciones.map((op, i) => {
        const estado = sel === null ? "" : i === correcta ? " ok" : i === sel ? " bad" : "";
        return (
          <div key={i} className={`qz-opt${estado}`} onClick={() => setSel(i)}>
            {op}
          </div>
        );
      })}
      {sel !== null && (
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: sel === correcta ? "var(--valid)" : "var(--danger)" }}>
          {sel === correcta ? "✓ ¡Correcto!" : "✗ Repasá el contenido de la lección."}
        </div>
      )}
    </div>
  );
}
