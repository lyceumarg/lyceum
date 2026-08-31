import { createClient } from "@/lib/supabase/server";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

export const metadata = { title: "Participantes" };

const ORIGEN_LABEL: Record<string, string> = {
  compra: "Mercado Pago", manual: "Online", masivo: "Manual", cupo: "Cupo",
};

export default async function ParticipantesPage() {
  const supabase = createClient();

  // tenant_admin puede leer las inscripciones del tenant (RLS).
  const { data: rows } = await supabase
    .from("enrollments")
    .select("id, estado, origen, fecha_inscripcion, profiles(nombre), courses(titulo)")
    .order("fecha_inscripcion", { ascending: false })
    .limit(200);

  // Filas ya formateadas como texto plano para el CSV (props serializables
  // hacia el botón, que es un Client Component).
  const csvRows = (rows ?? []).map((r: any) => ({
    fecha: new Date(r.fecha_inscripcion).toLocaleDateString("es-AR"),
    alumno: r.profiles?.nombre ?? "—",
    curso: r.courses?.titulo ?? "—",
    estado: r.estado,
    origen: ORIGEN_LABEL[r.origen] ?? r.origen,
  }));

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
          ]}
        />
      </div>

      {rows && rows.length ? (
        <div className="tbl-scroll">
        <table className="tbl">
          <thead>
            <tr><th>Alumno</th><th>Curso</th><th>Estado</th><th>Origen</th><th>Inscripción</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.profiles?.nombre ?? "—"}</td>
                <td>{r.courses?.titulo ?? "—"}</td>
                <td>{r.estado}</td>
                <td>{ORIGEN_LABEL[r.origen] ?? r.origen}</td>
                <td>{new Date(r.fecha_inscripcion).toLocaleDateString("es-AR")}</td>
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
