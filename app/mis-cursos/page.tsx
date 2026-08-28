import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/auth";
import { getMyDashboard } from "@/lib/queries";
import EmitParticipationButton from "@/components/EmitParticipationButton";

export const metadata = { title: "Mis cursos" };

function code(cat: string | null, titulo: string) {
  const src = (cat?.split("·").pop() ?? titulo).trim();
  return src.replace(/[^A-Za-zÁÉÍÓÚÑ]/g, "").slice(0, 3).toUpperCase() || "CUR";
}

export default async function MisCursos() {
  const user = await getUserContext();
  if (!user) redirect("/login");

  const rows = await getMyDashboard();
  const certs = rows.filter((r) => r.cert_id);

  return (
    <div className="wrap">
      <div className="sec-head">
        <div>
          <span className="eyebrow">Tu cuenta</span>
          <h2>Mis cursos</h2>
        </div>
      </div>

      {rows.length ? (
        <div className="enrolled-grid">
          {rows.map((r) => {
            const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
            return (
              <div className="card enrolled" key={r.course_id}>
                <div className="top">
                  <div className="tag">{code(r.categoria, r.titulo)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>{r.titulo}</div>
                    {r.categoria && (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{r.categoria}</div>
                    )}
                  </div>
                </div>
                <div className="progress"><span style={{ width: `${pct}%` }} /></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{pct}% completado</span>
                  {r.cert_id ? (
                    <span className="pill valid">● {r.cert_tipo === "participacion" ? "Constancia" : "Certificado"}</span>
                  ) : pct === 100 ? (
                    <span className="pill">Completado</span>
                  ) : (
                    <span className="pill">En curso</span>
                  )}
                </div>
                <Link href={`/curso/${r.course_id}/cursar`} className="btn ghost" style={{ alignSelf: "start", padding: "8px 14px", fontSize: 13 }}>
                  {r.cert_id ? "Repasar" : "Continuar"}
                </Link>
                {!r.cert_id && r.total > 0 && r.done >= r.total && r.emite_participacion && (
                  <EmitParticipationButton courseId={r.course_id} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card empty">
          Todavía no estás inscripto en ningún curso.{" "}
          <Link href="/" style={{ color: "var(--accent)", fontWeight: 600 }}>Ver catálogo</Link>
        </div>
      )}

      <div className="sec-head">
        <div>
          <span className="eyebrow">Credenciales</span>
          <h2 style={{ fontSize: 22 }}>Mis certificados</h2>
        </div>
      </div>
      {certs.length ? (
        certs.map((r) => (
          <div className="card" key={r.cert_id} style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{r.titulo}</div>
              <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{r.cert_id}</div>
            </div>
            <Link href={`/verificar?id=${r.cert_id}`} className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
              Verificar
            </Link>
          </div>
        ))
      ) : (
        <div className="card empty" style={{ padding: 24 }}>
          Tus certificados aprobados aparecerán acá.
        </div>
      )}
    </div>
  );
}
