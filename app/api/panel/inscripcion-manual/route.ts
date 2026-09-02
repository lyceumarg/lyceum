import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserContext, isStaff } from "@/lib/auth";
import { currentHost } from "@/lib/tenant";
import { sendMail } from "@/lib/email";
import { inscripcionConfirmadaHtml } from "@/lib/emails/inscripcion-confirmada";

type Linea = { email: string; nombre: string | null };
type Resultado = {
  email: string;
  estado: "creado_e_inscripto" | "inscripto" | "ya_inscripto" | "error";
  detalle?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parsearLista(texto: string): { validas: Linea[]; invalidas: string[] } {
  const validas: Linea[] = [];
  const invalidas: string[] = [];
  const vistos = new Set<string>();
  for (const linea0 of texto.split("\n")) {
    const linea = linea0.trim();
    if (!linea) continue;
    const [emailRaw, ...resto] = linea.split(",");
    const email = (emailRaw || "").trim().toLowerCase();
    const nombre = resto.join(",").trim() || null;
    if (!EMAIL_RE.test(email)) { invalidas.push(linea); continue; }
    if (vistos.has(email)) continue; // deduplicar dentro de la misma lista
    vistos.add(email);
    validas.push({ email, nombre });
  }
  return { validas, invalidas };
}

export async function POST(request: NextRequest) {
  const user = await getUserContext();
  if (!user || !isStaff(user.rol) || !user.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { courseId, lista } = await request.json();
  if (!courseId || typeof lista !== "string") {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // El curso tiene que ser de ESTE tenant (bajo RLS, con la sesión real del staff).
  const supabase = createClient();
  const { data: curso } = await supabase
    .from("courses")
    .select("id, titulo")
    .eq("id", courseId)
    .eq("tenant_id", user.tenantId)
    .maybeSingle();
  if (!curso) {
    return NextResponse.json({ error: "Curso no encontrado en tu academia" }, { status: 404 });
  }
  const { data: branding } = await supabase
    .from("tenant_branding")
    .select("nombre_academia")
    .eq("tenant_id", user.tenantId)
    .maybeSingle();
  const academia = branding?.nombre_academia ?? "tu academia";
  const cursarUrl = `https://${currentHost()}/curso/${courseId}/cursar`;

  const { validas, invalidas } = parsearLista(lista);
  if (!validas.length) {
    return NextResponse.json({ error: "No hay emails válidos en la lista", invalidas }, { status: 400 });
  }

  const admin = createAdminClient();
  const resultados: Resultado[] = [];

  for (const { email, nombre } of validas) {
    try {
      // ¿Existe ya una cuenta con este email? Se busca SIN filtrar por tenant
      // primero, para poder distinguir "ya es de esta academia" (la
      // reutilizamos) de "es de OTRA academia" (no se puede crear de nuevo) —
      // sin depender de interpretar el texto del error de Supabase.
      const { data: existentes, error: errBusqueda } = await admin
        .from("profiles")
        .select("id, tenant_id")
        .eq("email", email);
      if (errBusqueda) {
        resultados.push({ email, estado: "error", detalle: "No se pudo verificar el email: " + errBusqueda.message });
        continue;
      }

      const enEsteTenant = (existentes ?? []).find((p) => p.tenant_id === user.tenantId);
      const enOtroTenant = (existentes ?? []).find((p) => p.tenant_id !== user.tenantId);

      let userId: string;
      let creado = false;

      if (enEsteTenant) {
        userId = enEsteTenant.id;
      } else if (enOtroTenant) {
        resultados.push({ email, estado: "error", detalle: "Ese email ya tiene cuenta en otra academia de Lyceum" });
        continue;
      } else {
        const password = randomUUID();
        const { data: nuevo, error: errCrear } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nombre },
          app_metadata: { tenant_id: user.tenantId, rol: "participante", alta_por_staff: true },
        });
        if (errCrear || !nuevo.user) {
          resultados.push({ email, estado: "error", detalle: errCrear?.message ?? "No se pudo crear la cuenta" });
          continue;
        }
        userId = nuevo.user.id;
        creado = true;
        // Igual que en el registro: Supabase escribe app_metadata en un paso
        // posterior al alta, así que el trigger puede leerlo vacío. Se fija
        // acá de forma explícita para no depender de ese orden.
        await admin.from("profiles")
          .update({ tenant_id: user.tenantId, rol: "participante", alta_por_staff: true })
          .eq("id", userId);
      }

      // ¿Ya está inscripto en este curso?
      const { data: yaInscripto } = await admin
        .from("enrollments")
        .select("id")
        .eq("tenant_id", user.tenantId)
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (yaInscripto) {
        resultados.push({ email, estado: "ya_inscripto" });
        continue;
      }

      const { error: errInscribir } = await admin.from("enrollments").insert({
        tenant_id: user.tenantId, user_id: userId, course_id: courseId, origen: "masivo", estado: "activa",
      });
      if (errInscribir) {
        resultados.push({ email, estado: "error", detalle: errInscribir.message });
        continue;
      }

      // Mail al participante SOLO en la primera inscripción (no cuando ya
      // estaba inscripto — ese caso ya se filtró arriba). Si el envío
      // falla, no se cae la inscripción en sí, que ya quedó hecha.
      sendMail({
        to: [email],
        subject: `Ya estás inscripto en ${curso.titulo}`,
        html: inscripcionConfirmadaHtml({ alumnoNombre: nombre, curso: curso.titulo, academia, cursarUrl }),
      }).catch(() => {});

      resultados.push({ email, estado: creado ? "creado_e_inscripto" : "inscripto" });
    } catch (e: any) {
      resultados.push({ email, estado: "error", detalle: e?.message ?? "Error inesperado" });
    }
  }

  return NextResponse.json({ resultados, invalidas });
}
