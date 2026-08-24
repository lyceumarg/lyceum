import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NewCourseButton from "@/components/panel/NewCourseButton";

export const metadata = { title: "Panel" };

export default async function PanelHome() {
  const supabase = createClient();

  // RLS: solo cuenta/lee lo del tenant del staff.
  const [{ data: courses }, { count: inscriptos }, { count: certs }] = await Promise.all([
    supabase.from("courses").select("id, titulo, estado, categoria, precio").order("created_at", { ascending: false }),
    supabase.from("enrollments").select("id", { count: "exact", head: true }),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
  ]);

  const publicados = (courses ?? []).filter((c) => c.estado === "publicado").length;

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Cursos</h2>
        </div>
        <NewCourseButton />
      </div>

      <div className="kpis">
        <div className="card kpi"><div className="n">{courses?.length ?? 0}</div><div className="l">Cursos ({publicados} publicados)</div></div>
        <div className="card kpi"><div className="n">{inscriptos ?? 0}</div><div className="l">Inscripciones</div></div>
        <div className="card kpi"><div className="n">{certs ?? 0}</div><div className="l">Certificados emitidos</div></div>
      </div>

      {courses && courses.length ? (
        <table className="tbl">
          <thead>
            <tr><th>Curso</th><th>Categoría</th><th>Estado</th><th>Precio</th></tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="clk">
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/panel/cursos/${c.id}`}>{c.titulo}</Link>
                </td>
                <td>{c.categoria ?? "—"}</td>
                <td><span className={`st ${c.estado === "publicado" ? "pub" : "draft"}`}>{c.estado === "publicado" ? "Publicado" : "Borrador"}</span></td>
                <td className="mono">${new Intl.NumberFormat("es-AR").format(c.precio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="card empty">Todavía no cargaste cursos. Creá el primero.</div>
      )}
    </>
  );
}
