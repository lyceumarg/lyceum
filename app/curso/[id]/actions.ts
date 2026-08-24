"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Inscripción sin pago (origen 'manual') para poder recorrer el circuito.
// En Fase 2 esto lo dispara el webhook de Mercado Pago tras el pago aprobado.
export async function inscribirme(courseId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = (user.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) redirect("/");

  await supabase
    .from("enrollments")
    .upsert(
      { tenant_id: tenantId, user_id: user.id, course_id: courseId, origen: "manual" },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    );

  redirect(`/curso/${courseId}/cursar`);
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
