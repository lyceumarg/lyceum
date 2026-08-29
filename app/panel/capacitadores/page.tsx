import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth";
import CapacitadoresManager, { type Instructor } from "@/components/panel/CapacitadoresManager";

export const metadata = { title: "Capacitadores" };

export default async function CapacitadoresPage() {
  const user = await getUserContext();
  if (!user) redirect("/login");
  const supabase = createClient();

  const { data: instructores } = await supabase
    .from("instructores")
    .select("id, nombre, headline, bio, foto_url, linkedin_url")
    .eq("tenant_id", user.tenantId)
    .order("nombre");

  // Cuántos cursos dicta cada uno, para avisar antes de borrar.
  const { data: cursos } = await supabase
    .from("courses")
    .select("id, titulo, capacitador_id")
    .eq("tenant_id", user.tenantId)
    .not("capacitador_id", "is", null);

  const cursosPorInstructor = new Map<string, string[]>();
  (cursos ?? []).forEach((c) => {
    if (!c.capacitador_id) return;
    const arr = cursosPorInstructor.get(c.capacitador_id) ?? [];
    arr.push(c.titulo);
    cursosPorInstructor.set(c.capacitador_id, arr);
  });

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Capacitadores</h2>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: -14, marginBottom: 20 }}>
        Fichas de quienes dictan tus cursos — no requieren cuenta en el sistema. Se asignan por curso desde el editor.
      </p>
      <CapacitadoresManager
        tenantId={user.tenantId!}
        initial={(instructores ?? []) as Instructor[]}
        cursosPorInstructor={Object.fromEntries(cursosPorInstructor)}
      />
    </>
  );
}
