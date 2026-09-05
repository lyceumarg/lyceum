"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportarPptxButton() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true); setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/panel/importar-pptx", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "No se pudo importar el archivo."); setSubiendo(false); return; }
      router.push(`/panel/cursos/${data.courseId}`);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setSubiendo(false);
    }
  }

  return (
    <>
      <button className="btn ghost" onClick={() => setAbierto(true)}>Importar desde PowerPoint</button>
      {abierto && (
        <div className="modal-backdrop" onClick={() => !subiendo && setAbierto(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3 style={{ fontSize: 16 }}>Importar curso desde PowerPoint</h3>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>La presentación tiene que seguir la plantilla de Lyceum.</p>
              </div>
              {!subiendo && <button className="tx" onClick={() => setAbierto(false)}>✕</button>}
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
                La primera diapositiva define el nombre del curso. Una diapositiva con diseño{" "}
                <strong>Encabezado de sección</strong> arranca un módulo nuevo; el resto de las diapositivas
                se convierten en lecciones. Marcadores como <code>[DESTACADO]</code>, <code>[CASO PRÁCTICO]</code> y{" "}
                <code>[PREGUNTA]</code> al principio del <strong>título</strong> de la diapositiva arman esos
                bloques. El curso se crea como borrador — revisalo antes de publicarlo.
              </p>
              <a href="/plantilla-curso-lyceum.pptx" download style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, display: "inline-block", marginBottom: 14 }}>
                ↓ Descargar la plantilla
              </a>
              <br />
              <input type="file" accept=".pptx" onChange={onFile} disabled={subiendo} style={{ marginBottom: 10 }} />
              {subiendo && <p style={{ fontSize: 13, color: "var(--muted)" }}>Importando…</p>}
              {error && <div className="msg err">{error}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
