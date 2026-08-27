import { createClient } from "@/lib/supabase/server";
import ExportCsvButton from "@/components/panel/ExportCsvButton";

export const metadata = { title: "Ganancias" };

type OrderRow = {
  id: string;
  monto: number;
  estado: string;
  created_at: string;
  courses: { titulo: string } | null;
};

const money = (n: number) => `$${new Intl.NumberFormat("es-AR").format(Math.round(n))}`;

export default async function GananciasPage() {
  const supabase = createClient();

  // RLS: tenant_admin ve todas las órdenes de su tenant.
  const { data } = await supabase
    .from("orders")
    .select("id, monto, estado, created_at, courses(titulo)")
    .order("created_at", { ascending: false })
    .limit(500);

  const orders = (data ?? []) as unknown as OrderRow[];
  const aprobadas = orders.filter((o) => o.estado === "aprobado");
  const pendientes = orders.filter((o) => o.estado === "pendiente");

  const totalIngresos = aprobadas.reduce((s, o) => s + Number(o.monto), 0);
  const ticketProm = aprobadas.length ? totalIngresos / aprobadas.length : 0;

  // Últimos 6 meses, ingresos aprobados por mes.
  const meses: { label: string; key: string; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    meses.push({ label: d.toLocaleDateString("es-AR", { month: "short" }), key: `${d.getFullYear()}-${d.getMonth()}`, total: 0 });
  }
  for (const o of aprobadas) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = meses.find((x) => x.key === key);
    if (m) m.total += Number(o.monto);
  }
  const maxMes = Math.max(1, ...meses.map((m) => m.total));

  const estadoLabel: Record<string, string> = {
    aprobado: "Aprobado", pendiente: "Pendiente", rechazado: "Rechazado", reembolsado: "Reembolsado",
  };
  const estadoClase: Record<string, string> = {
    aprobado: "valid", pendiente: "warn", rechazado: "danger", reembolsado: "muted",
  };

  const csvRows = orders.map((o) => ({
    fecha: new Date(o.created_at).toLocaleDateString("es-AR"),
    curso: o.courses?.titulo ?? "—",
    estado: estadoLabel[o.estado] ?? o.estado,
    monto: Number(o.monto),
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
          filename="ordenes"
          columns={[
            { key: "fecha", label: "Fecha" },
            { key: "curso", label: "Curso" },
            { key: "estado", label: "Estado" },
            { key: "monto", label: "Monto (ARS)" },
          ]}
        />
      </div>

      <div className="kpis">
        <div className="card kpi"><div className="n">{money(totalIngresos)}</div><div className="l">Ingresos aprobados</div></div>
        <div className="card kpi"><div className="n">{aprobadas.length}</div><div className="l">Ventas aprobadas</div></div>
        <div className="card kpi"><div className="n">{money(ticketProm)}</div><div className="l">Ticket promedio</div></div>
        <div className="card kpi"><div className="n">{pendientes.length}</div><div className="l">Pagos pendientes</div></div>
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
            Todavía no hay ventas aprobadas. Este panel se completa solo cuando esté activo el cobro con Mercado Pago.
          </p>
        )}
      </div>

      <h3 style={{ fontSize: 18, marginBottom: 12 }}>Órdenes recientes</h3>
      {orders.length ? (
        <table className="tbl">
          <thead><tr><th>Fecha</th><th>Curso</th><th>Estado</th><th>Monto</th></tr></thead>
          <tbody>
            {orders.slice(0, 100).map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.created_at).toLocaleDateString("es-AR")}</td>
                <td style={{ fontWeight: 600 }}>{o.courses?.titulo ?? "—"}</td>
                <td><span className={`pill ${estadoClase[o.estado] ?? ""}`}>{estadoLabel[o.estado] ?? o.estado}</span></td>
                <td className="mono">{money(Number(o.monto))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="card empty">
          Todavía no hay órdenes. Van a aparecer acá apenas se registre la primera venta.
        </div>
      )}
    </>
  );
}
