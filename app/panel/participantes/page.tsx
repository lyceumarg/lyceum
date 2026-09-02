import { createClient } from "@/lib/supabase/server";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

export const metadata = { title: "Participantes" };

const ORIGEN_LABEL: Record<string, string> = {
  compra: "Mercado Pago", manual: "Online", masivo: "Manual", cupo: "Cupo",
};
const ESTADO_LABEL: Record<string, string> = {
  activa: "Activa", completada: "Completada", cancelada: "Cancelada",
};

export default async function ParticipantesPage() {
  const supabase = createClient();

  // RPC: calcula avance % y certificado/puntaje en el servidor (evita una
  // consulta extra por cada participante desde el cliente).
  const { data: rows } = await supabase.rpc("participantes_con_avance");
  const filas = (rows ?? []) as any[];

  const csvRows = filas.map((f) => ({
    fecha: new Date(f.fecha_inscripcion).toLocaleDateString("es-AR"),
    alumno: f.alumno_nombre ?? f.alumno_email ?? "—",
    curso: f.curso_titulo ?? "—",
    estado: ESTADO_LABEL[f.estado] ?? f.estado,
    origen: ORIGEN_LABEL[f.origen] ?? f.origen,
    avance: `${f.avance_pct ?? 0}%`,
    finalizacion: f.cert_fecha ? new Date(f.cert_fecha).toLocaleDateString("es-AR") : "",
    puntaje: f.cert_puntaje ?? "",
  }));

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
            columns={[
              { key: "fecha", label: "Fecha" },
              { key: "alumno", label: "Alumno" },
              { key: "curso", label: "Curso" },
              { key: "estado", label: "Estado" },
              { key: "origen", label: "Origen" },
              { key: "avance", label: "Avance" },
              { key: "finalizacion", label: "Finalización" },
              { key: "puntaje", label: "Puntaje" },
            ]}
          />
          <a href="/api/panel/participantes-docx" className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
            Exportar Word
          </a>
        </div>
      </div>

      {filas.length ? (
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr><th>Alumno</th><th>Curso</th><th>Estado</th><th>Origen</th><th>Avance</th><th>Inscripción</th><th>Finalización</th><th>Puntaje</th></tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.enrollment_id}>
                <td style={{ fontWeight: 600 }}>{f.alumno_nombre ?? f.alumno_email ?? "—"}</td>
                <td>{f.curso_titulo ?? "—"}</td>
                <td><span className={`st ${f.estado}`}>{ESTADO_LABEL[f.estado] ?? f.estado}</span></td>
                <td>{ORIGEN_LABEL[f.origen] ?? f.origen}</td>
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
        <div className="card empty">Todavía no hay participantes inscriptos.</div>
      )}
    </>
  );
}
