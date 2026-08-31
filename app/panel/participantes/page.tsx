import { createClient } from "@/lib/supabase/server";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

export const metadata = { title: "Participantes" };

const ORIGEN_LABEL: Record<string, string> = {
  compra: "Mercado Pago", manual: "Online", masivo: "Manual", cupo: "Cupo",
};

type Cert = { puntaje: number | null; fecha_emision: string; tipo: string };

// De los certificados de una inscripción (puede tener uno de participación
// y otro de aprobación), se muestra el de aprobación si existe —tiene
// puntaje—, si no el de participación —solo fecha—.
function mejorCertificado(certs: Cert[] | null | undefined): Cert | null {
  if (!certs?.length) return null;
  return certs.find((c) => c.tipo === "certificacion") ?? certs.find((c) => c.tipo === "participacion") ?? null;
}

export default async function ParticipantesPage() {
  const supabase = createClient();

  // tenant_admin puede leer las inscripciones del tenant (RLS).
  const { data: rows } = await supabase
    .from("enrollments")
    .select("id, estado, origen, fecha_inscripcion, profiles(nombre), courses(titulo), certificates(puntaje, fecha_emision, tipo)")
    .order("fecha_inscripcion", { ascending: false })
    .limit(200);

  // Filas ya formateadas como texto plano para el CSV (props serializables
  // hacia el botón, que es un Client Component).
  const csvRows = (rows ?? []).map((r: any) => {
    const cert = mejorCertificado(r.certificates);
    return {
      fecha: new Date(r.fecha_inscripcion).toLocaleDateString("es-AR"),
      alumno: r.profiles?.nombre ?? "—",
      curso: r.courses?.titulo ?? "—",
      estado: r.estado,
      origen: ORIGEN_LABEL[r.origen] ?? r.origen,
      finalizacion: cert ? new Date(cert.fecha_emision).toLocaleDateString("es-AR") : "",
      puntaje: cert?.puntaje ?? "",
    };
  });

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Participantes</h2>
        </div>
        <ExportCsvButton
          rows={csvRows}
          filename="participantes"
          columns={[
            { key: "fecha", label: "Fecha" },
            { key: "alumno", label: "Alumno" },
            { key: "curso", label: "Curso" },
            { key: "estado", label: "Estado" },
            { key: "origen", label: "Origen" },
            { key: "finalizacion", label: "Finalización" },
            { key: "puntaje", label: "Puntaje" },
          ]}
        />
      </div>

      {rows && rows.length ? (
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr><th>Alumno</th><th>Curso</th><th>Estado</th><th>Origen</th><th>Inscripción</th><th>Finalización</th><th>Puntaje</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const cert = mejorCertificado(r.certificates);
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.profiles?.nombre ?? "—"}</td>
                  <td>{r.courses?.titulo ?? "—"}</td>
                  <td>{r.estado}</td>
                  <td>{ORIGEN_LABEL[r.origen] ?? r.origen}</td>
                  <td>{new Date(r.fecha_inscripcion).toLocaleDateString("es-AR")}</td>
                  <td>{cert ? new Date(cert.fecha_emision).toLocaleDateString("es-AR") : "—"}</td>
                  <td className="mono">{cert?.puntaje != null ? `${cert.puntaje}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="card empty">Todavía no hay participantes inscriptos.</div>
      )}
    </>
  );
}
