import { createClient } from "@/lib/supabase/server";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

export const metadata = { title: "Participantes" };

export default async function ParticipantesPage() {
  const supabase = createClient();

  // tenant_admin puede leer las inscripciones del tenant (RLS).
  const { data: rows } = await supabase
    .from("enrollments")
    .select("id, estado, origen, fecha_inscripcion, profiles(nombre), courses(titulo)")
    .order("fecha_inscripcion", { ascending: false })
    .limit(200);

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Participantes</h2>
        </div>
        <ExportCsvButton
          rows={rows ?? []}
          filename="participantes"
          columns={[
            { key: "fecha_inscripcion", label: "Fecha", format: (v) => new Date(v).toLocaleDateString("es-AR") },
            { key: "profiles", label: "Alumno", format: (v: any) => v?.nombre ?? "—" },
            { key: "courses", label: "Curso", format: (v: any) => v?.titulo ?? "—" },
            { key: "estado", label: "Estado" },
            { key: "origen", label: "Origen" },
          ]}
        />
      </div>

      {rows && rows.length ? (
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
                <td>{r.origen}</td>
                <td>{new Date(r.fecha_inscripcion).toLocaleDateString("es-AR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="card empty">Todavía no hay participantes inscriptos.</div>
      )}
    </>
  );
}
