import { createClient } from "@/lib/supabase/server";
import { currentHost } from "@/lib/tenant";

// ------- PÚBLICO (anónimo): storefront de la academia del host -------
// Usa RPCs security definer; el anónimo nunca lee tablas directo.
export async function getCatalog() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("catalog_by_host", { p_host: currentHost() });
  if (error) throw error;
  return data;
}

export async function getCourseDetail(courseId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("course_detail_public", {
    p_host: currentHost(),
    p_course: courseId,
  });
  if (error) throw error;
  return data;
}

export async function verifyCertificate(idPublico: string) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("verify_certificate", { p_id_publico: idPublico });
  if (error) throw error;
  return data?.[0] ?? null;
}

// ------- STAFF (tenant_admin/instructor): crear curso -------
// No pasa tenant_id: RLS lo exige = current_tenant_id() del JWT.
// Se envía igual el tenant_id resuelto por RLS mediante DEFAULT en policy? No:
// la columna es NOT NULL, así que lo tomamos del contexto y RLS valida que
// coincida con el del JWT (defensa en profundidad).
export async function createCourse(input: {
  titulo: string;
  descripcion?: string;
  precio?: number;
  categoria?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
  if (!tenantId) throw new Error("sin tenant");

  const { data, error } = await supabase
    .from("courses")
    .insert({
      tenant_id: tenantId,
      titulo: input.titulo,
      descripcion: input.descripcion,
      precio: input.precio ?? 0,
      categoria: input.categoria,
      estado: "borrador",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ------- PARTICIPANTE: rendir examen (corrección server-side) -------
// answers = { "<question_id>": "<option_id>" }
export async function submitExam(courseId: string, answers: Record<string, string>) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("submit_exam", {
    p_course: courseId,
    p_answers: answers,
  });
  if (error) throw error;
  return data as { puntaje: number; aprobado: boolean; certificado: string | null };
}

// ------- PARTICIPANTE: panel (inscripciones + avance + certificado) -------
export type DashRow = {
  course_id: string;
  titulo: string;
  categoria: string | null;
  estado: string;
  total: number;
  done: number;
  cert_id: string | null;
  cert_tipo: string | null;
  emite_participacion: boolean;
  emite_certificacion: boolean;
};

export async function getMyDashboard(): Promise<DashRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("my_courses");
  if (error) throw error;
  return (data ?? []) as DashRow[];
}
