import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth";
import PerfilEditor from "@/components/PerfilEditor";

export const metadata = { title: "Mi perfil" };

export default async function PerfilPage() {
  const user = await getUserContext();
  if (!user) redirect("/login");
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user.userId)
    .single();

  const { data: cursos } = await supabase.rpc("my_courses");
  const realizados = (cursos ?? []).filter(
    (c: any) => c.cert_id || (c.total > 0 && c.done >= c.total)
  );

  return (
    <div className="wrap" style={{ maxWidth: 760, paddingTop: 28 }}>
      <span className="eyebrow">Tu cuenta</span>
      <h1 style={{ fontSize: 30, marginBottom: 24 }}>Mi perfil</h1>

      <PerfilEditor nombre={profile?.nombre ?? ""} email={user.email ?? ""} />

      <h2 style={{ fontSize: 20, margin: "34px 0 14px" }}>Cursos realizados</h2>
      {realizados.length ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {realizados.map((c: any, i: number) => (
            <div
              key={c.course_id}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                borderTop: i ? "1px solid var(--line)" : "none", flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600 }}>{c.titulo}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {c.cert_fecha
                    ? `Emitido el ${new Date(c.cert_fecha).toLocaleDateString("es-AR")}`
                    : "Completado"}
                </div>
              </div>
              {c.cert_id ? (
                <>
                  <span className="pill valid">
                    ● {c.cert_tipo === "participacion" ? "Constancia" : "Certificado"}
                  </span>
                  <Link className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} href={`/certificado/${c.cert_id}`}>
                    Ver credencial
                  </Link>
                </>
              ) : (
                <span className="pill" style={{ fontSize: 12, color: "var(--muted)" }}>Completado</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty">Todavía no completaste ningún curso. <Link href="/">Ver catálogo</Link></div>
      )}
    </div>
  );
}
