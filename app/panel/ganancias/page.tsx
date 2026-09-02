import { createClient } from "@/lib/supabase/server";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

export const metadata = { title: "Ganancias" };

type EnrollRow = {
  id: string;
  origen: string;
  estado: string;
  fecha_inscripcion: string;
  courses: { titulo: string; precio: number } | null;
};

const money = (n: number) => `$${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;

export default async function GananciasPage() {
  const supabase = createClient();

  // RLS: tenant_admin ve todas las inscripciones de su tenant.
  // El ingreso se calcula por CADA inscripción activa (precio del curso al
  // momento de consultar), sin importar si se pagó por Mercado Pago o por
  // fuera de la plataforma (convenio, transferencia, inscripción manual).
  const { data } = await supabase
    .from("enrollments")
    .select("id, origen, estado, fecha_inscripcion, courses(titulo, precio)")
    .order("fecha_inscripcion", { ascending: false })
    .limit(1000);

  const todas = (data ?? []) as unknown as EnrollRow[];
  const validas = todas.filter((e) => e.estado !== "cancelada");

  const totalIngresos = validas.reduce((s, e) => s + Number(e.courses?.precio ?? 0), 0);
  const ticketProm = validas.length ? totalIngresos / validas.length : 0;
  const viaMP = validas.filter((e) => e.origen === "compra").length;
  const porFuera = validas.length - viaMP;
  const gratuitas = validas.filter((e) => Number(e.courses?.precio ?? 0) === 0).length;

  const meses: { label: string; key: string; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({ label: d.toLocaleDateString("es-AR", { month: "short" }), key: `${d.getFullYear()}-${d.getMonth()}`, total: 0 });
  }
  for (const e of validas) {
    const d = new Date(e.fecha_inscripcion);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = meses.find((x) => x.key === key);
    if (m) m.total += Number(e.courses?.precio ?? 0);
  }
  const maxMes = Math.max(1, ...meses.map((m) => m.total));

  const origenLabel: Record<string, string> = {
    compra: "Mercado Pago", manual: "Online", masivo: "Manual", cupo: "Cupo",
  };
  const origenClase: Record<string, string> = {
    compra: "valid", manual: "muted", masivo: "t", cupo: "warn",
  };

  const csvRows = validas.map((e) => ({
    fecha: new Date(e.fecha_inscripcion).toLocaleDateString("es-AR"),
    curso: e.courses?.titulo ?? "—",
    origen: origenLabel[e.origen] ?? e.origen,
    monto: Number(e.courses?.precio ?? 0),
  }));

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Ganancias</h2>
        </div>
        <ExportCsvButton
          rows={csvRows}
          filename="inscripciones"
          columns={[
            { key: "fecha", label: "Fecha" },
            { key: "curso", label: "Curso" },
            { key: "origen", label: "Origen" },
            { key: "monto", label: "Monto (ARS)" },
          ]}
        />
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: -14, marginBottom: 20 }}>
        Incluye toda inscripción activa: pagada con Mercado Pago o acordada por fuera de la plataforma (convenio, transferencia, inscripción manual).
      </p>

      <div className="kpis">
        <div className="card kpi"><div className="n">{money(totalIngresos)}</div><div className="l">Ingresos totales</div></div>
        <div className="card kpi"><div className="n">{validas.length}</div><div className="l">Inscripciones</div></div>
        <div className="card kpi"><div className="n">{money(ticketProm)}</div><div className="l">Ticket promedio</div></div>
        <div className="card kpi"><div className="n">{viaMP}</div><div className="l">Vía Mercado Pago ({porFuera} por fuera)</div></div>
        <div className="card kpi"><div className="n">{gratuitas}</div><div className="l">Inscriptas en cursos gratuitos</div></div>
      </div>

      <div className="card" style={{ padding: 22, marginBottom: 22 }}>
        <h3 style={{ fontSize: 16, marginBottom: 18 }}>Últimos 6 meses</h3>
        <div className="barchart">
          {meses.map((m) => (
            <div className="bar-col" key={m.key}>
              <div className="bar-val">{m.total > 0 ? money(m.total) : ""}</div>
              <div className="bar" style={{ height: `${Math.max(4, (m.total / maxMes) * 120)}px` }} />
              <div className="bar-lbl">{m.label}</div>
            </div>
          ))}
        </div>
        {totalIngresos === 0 && (
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 14 }}>
            Todavía no hay inscripciones. Este panel se completa apenas se registre la primera.
          </p>
        )}
      </div>

      <h3 style={{ fontSize: 18, marginBottom: 12 }}>Inscripciones recientes</h3>
      {validas.length ? (
        <div className="tbl-scroll">
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Curso</th><th>Origen</th><th>Monto</th></tr></thead>
          <tbody>
            {validas.slice(0, 100).map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.fecha_inscripcion).toLocaleDateString("es-AR")}</td>
                <td style={{ fontWeight: 600 }}>{e.courses?.titulo ?? "—"}</td>
                <td><span className={`pill ${origenClase[e.origen] ?? ""}`}>{origenLabel[e.origen] ?? e.origen}</span></td>
                <td className="mono">{money(Number(e.courses?.precio ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
        <div className="card empty">
          Todavía no hay inscripciones. Van a aparecer acá apenas se registre la primera.
        </div>
      )}
    </>
  );
}
