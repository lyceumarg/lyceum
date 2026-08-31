import { Resend } from "resend";

// Mails de la APLICACIÓN (ej. solicitud de inscripción) — distintos de los
// de Supabase Auth (reset de contraseña, etc.), que van por SMTP integrado.
// Requiere RESEND_API_KEY en las variables de entorno.
export async function sendMail({
  to, subject, html,
}: { to: string[]; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY no configurada — no se pudo enviar el mail:", subject);
    return { ok: false as const, error: "Envío de mail no configurado" };
  }
  if (!to.length) {
    return { ok: false as const, error: "Sin destinatarios" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Lyceum <no-reply@lyceum.com.ar>",
      to,
      subject,
      html,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  } catch (e: any) {
    return { ok: false as const, error: e?.message ?? "Error inesperado al enviar el mail" };
  }
}
