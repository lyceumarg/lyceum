import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserContext } from "@/lib/auth";

// Cambia el rol de alguien tanto en `profiles` (para lecturas cómodas desde
// la UI) como en `auth.users.app_metadata` (la fuente real que usa el
// middleware y el resto de RLS para decidir accesos). Actualizar solo
// `profiles` deja a la persona con el rol viejo hasta que se le ocurra
// cerrar sesión y volver a entrar — y a veces ni así, si el token no se
// refresca. Por eso este endpoint hace las dos cosas siempre juntas.
async function setRol(adminClient: ReturnType<typeof createAdminClient>, userId: string, tenantId: string, rol: "tenant_admin" | "participante") {
  const { error: errProfile } = await adminClient.from("profiles").update({ rol }).eq("id", userId);
  if (errProfile) return { error: errProfile.message };

  const { data: authUser, error: errGet } = await adminClient.auth.admin.getUserById(userId);
  if (errGet || !authUser?.user) return { error: errGet?.message || "No se encontró la cuenta." };

  const { error: errAuth } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { ...authUser.user.app_metadata, tenant_id: tenantId, rol },
  });
  if (errAuth) return { error: errAuth.message };
  return { error: null };
}

export async function POST(request: NextRequest) {
  const user = await getUserContext();
  if (!user || user.rol !== "tenant_admin" || !user.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { accion, email, userId } = await request.json();
  const admin = createAdminClient();

  if (accion === "agregar") {
    const correo = String(email || "").trim().toLowerCase();
    if (!correo) return NextResponse.json({ error: "Falta el email" }, { status: 400 });

    const { data: persona, error: errBuscar } = await admin
      .from("profiles")
      .select("id, nombre, email")
      .eq("tenant_id", user.tenantId)
      .ilike("email", correo)
      .maybeSingle();
    if (errBuscar) return NextResponse.json({ error: errBuscar.message }, { status: 500 });
    if (!persona) {
      return NextResponse.json({
        error: "Esa persona todavía no tiene una cuenta en tu academia — pedile que se registre primero, y después agregala de nuevo acá.",
      }, { status: 404 });
    }

    const { error } = await setRol(admin, persona.id, user.tenantId, "tenant_admin");
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ persona });
  }

  if (accion === "quitar") {
    if (!userId) return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });

    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", user.tenantId)
      .eq("rol", "tenant_admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "No podés quitar al único administrador de la academia — agregá otro primero." }, { status: 400 });
    }

    const { error } = await setRol(admin, userId, user.tenantId, "participante");
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
