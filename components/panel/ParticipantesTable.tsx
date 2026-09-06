"use client";
import { useMemo, useState } from "react";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

const ORIGEN_LABEL: Record<string, string> = {
  compra: "Mercado Pago", manual: "Online", masivo: "Manual", cupo: "Cupo",
};
const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa", completada: "Completada", cancelada: "Cancelada",
};

export default function ParticipantesTable({ filas }: { filas: any[] }) {
  const [qNombre, setQNombre] = useState("");
  const [qCurso, setQCurso] = useState("");
  const [qEstado, setQEstado] = useState("");
  const [exportando, setExportando] = useState(false);

  const cursos = useMemo(() => {
    const set = new Set<string>();
    filas.forEach((f) => f.curso_titulo && set.add(f.curso_titulo));
    return Array.from(set).sort();
  }, [filas]);

  const filtrados = useMemo(() => filas.filter((f) => {
    if (qCurso && f.curso_titulo !== qCurso) return false;
    if (qEstado && f.estado !== qEstado) return false;
    if (qNombre) {
      const t = (f.alumno_nombre || f.alumno_email || "").toLowerCase();
      if (!t.includes(qNombre.toLowerCase())) return false;
    }
    return true;
  }), [filas, qNombre, qCurso, qEstado]);

  const csvRows = filtrados.map((f) => ({
    fecha: new Date(f.fecha_inscripcion).toLocaleDateString("es-AR"),
    alumno: f.alumno_nombre ?? f.alumno_email ?? "—",
    curso: f.curso_titulo ?? "—",
    estado: ESTADO_LABEL[f.estado] ?? f.estado,
    origen: ORIGEN_LABEL[f.origen] ?? f.origen,
    avance: `${f.avance_pct ?? 0}%`,
    finalizacion: f.cert_fecha ? new Date(f.cert_fecha).toLocaleDateString("es-AR") : "",
    puntaje: f.cert_puntaje ?? "",
    cortesia: f.cortesia ? "Sí" : "No",
  }));

  async function exportarWord() {
    setExportando(true);
    try {
      const res = await fetch("/api/panel/participantes-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filas: filtrados }),
      });
      if (!res.ok) { alert("No se pudo generar el Word."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "participantes.docx";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  }

  const hayFiltro = qNombre || qCurso || qEstado;

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Participantes</h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ExportCsvButton
            rows={csvRows}
            filename="participantes"
            label={hayFiltro ? `Exportar CSV (${filtrados.length})` : "Exportar CSV"}
            columns={[
              { key: "fecha", label: "Fecha" },
              { key: "alumno", label: "Alumno" },
              { key: "curso", label: "Curso" },
              { key: "estado", label: "Estado" },
              { key: "origen", label: "Origen" },
              { key: "avance", label: "Avance" },
              { key: "finalizacion", label: "Finalización" },
              { key: "puntaje", label: "Puntaje" },
              { key: "cortesia", label: "Cortesía" },
            ]}
          />
          <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={exportarWord} disabled={exportando || !filtrados.length}>
            {exportando ? "Generando…" : hayFiltro ? `Exportar Word (${filtrados.length})` : "Exportar Word"}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="ed-inp" style={{ marginBottom: 0, maxWidth: 220 }}
          placeholder="Buscar participante…" value={qNombre} onChange={(e) => setQNombre(e.target.value)}
        />
        <select className="ed-inp" style={{ marginBottom: 0, maxWidth: 260 }} value={qCurso} onChange={(e) => setQCurso(e.target.value)}>
          <option value="">Todos los cursos</option>
          {cursos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="ed-inp" style={{ marginBottom: 0, maxWidth: 180 }} value={qEstado} onChange={(e) => setQEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        {hayFiltro && (
          <button className="btn ghost sm" onClick={() => { setQNombre(""); setQCurso(""); setQEstado(""); }}>
            Limpiar filtros
          </button>
        )}
        <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: "auto" }}>
          {filtrados.length} de {filas.length}
        </span>
      </div>

      {filas.length ? (
        filtrados.length ? (
          <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr><th>Alumno</th><th>Curso</th><th>Estado</th><th>Origen</th><th>Avance</th><th>Inscripción</th><th>Finalización</th><th>Puntaje</th></tr>
            </thead>
            <tbody>
              {filtrados.map((f) => (
                <tr key={f.enrollment_id}>
                  <td style={{ fontWeight: 600 }}>{f.alumno_nombre ?? f.alumno_email ?? "—"}</td>
                  <td>{f.curso_titulo ?? "—"}</td>
                  <td><span className={`st ${f.estado}`}>{ESTADO_LABEL[f.estado] ?? f.estado}</span></td>
                  <td>{ORIGEN_LABEL[f.origen] ?? f.origen}{f.cortesia && <span className="pill t" style={{ marginLeft: 6 }}>Cortesía</span>}</td>
                  <td className="mono">{f.avance_pct ?? 0}%</td>
                  <td>{new Date(f.fecha_inscripcion).toLocaleDateString("es-AR")}</td>
                  <td>{f.cert_fecha ? new Date(f.cert_fecha).toLocaleDateString("es-AR") : "—"}</td>
                  <td className="mono">{f.cert_puntaje != null ? `${f.cert_puntaje}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="card empty">Ningún participante coincide con estos filtros.</div>
        )
      ) : (
        <div className="card empty">Todavía no hay participantes inscriptos.</div>
      )}
    </>
  );
}
