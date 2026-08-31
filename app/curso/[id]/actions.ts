"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email";
import { solicitudInscripcionHtml } from "@/lib/emails/solicitud-inscripcion";

// La inscripción ya no se hace sola al tocar un botón: el alumno elige pagar
// por Mercado Pago (todavía no disponible) o pedirle a la academia que lo
// inscriba por fuera de la plataforma. Este segundo camino no crea la
// inscripción — solo avisa al staff, que la completa a mano desde
// "Inscripción masiva" una vez coordinado el pago.
export async function solicitarInscripcion(courseId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = (user.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return { ok: false, error: "No se pudo identificar tu academia" };

  const [{ data: perfil }, { data: curso }, { data: branding }, { data: admins }] = await Promise.all([
    supabase.from("profiles").select("nombre, email").eq("id", user.id).single(),
    supabase.from("courses").select("titulo").eq("id", courseId).single(),
    supabase.from("tenant_branding").select("nombre_academia").eq("tenant_id", tenantId).single(),
    supabase.from("profiles").select("email").eq("tenant_id", tenantId).eq("rol", "tenant_admin"),
  ]);

  const destinatarios = (admins ?? []).map((a) => a.email).filter((e): e is string => !!e);
  if (!destinatarios.length) {
    return { ok: false, error: "La academia todavía no tiene un contacto configurado" };
  }

  const academia = branding?.nombre_academia ?? "tu academia";
  const alumnoNombre = perfil?.nombre || "Sin nombre cargado";
  const alumnoEmail = perfil?.email || user.email || "—";
  const cursoTitulo = curso?.titulo ?? "Curso";

  const res = await sendMail({
    to: destinatarios,
    subject: `Nueva solicitud de inscripción — ${cursoTitulo}`,
    html: solicitudInscripcionHtml({ alumnoNombre, alumnoEmail, curso: cursoTitulo, academia }),
  });

  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function marcarCompletada(
  courseId: string,
  enrollmentId: string,
  lessonId: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const tenantId = (user.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) return;

  await supabase.from("lesson_progress").upsert(
    {
      tenant_id: tenantId,
      enrollment_id: enrollmentId,
      lesson_id: lessonId,
      completada: true,
      fecha: new Date().toISOString(),
    },
    { onConflict: "enrollment_id,lesson_id" }
  );
  revalidatePath(`/curso/${courseId}/cursar`);
}
