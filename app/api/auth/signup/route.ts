import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Alta de participante en la academia del host actual.
// CLAVE de seguridad: el tenant_id se resuelve del HOST en el servidor y se
// escribe en app_metadata con service_role. Nunca se confía en un tenant_id
// enviado por el cliente -> el usuario no puede "elegir" tenant ni escalar rol.
export async function POST(request: NextRequest) {
  const { email, password, nombre } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "email y password requeridos" }, { status: 400 });
  }

  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase();
  const admin = createAdminClient();

  // Resolver tenant por host (RPC de salida mínima).
  const { data: brand } = await admin.rpc("branding_by_host", { p_host: host });
  const tenant = brand?.[0];
  if (!tenant) {
    return NextResponse.json({ error: "academia no encontrada para este dominio" }, { status: 404 });
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { nombre },
    app_metadata: { tenant_id: tenant.tenant_id, rol: "participante" }, // fuente de verdad para RLS
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // El trigger on_auth_user_created ya crea el profile, pero Supabase escribe
  // app_metadata en un paso POSTERIOR al alta del usuario — el trigger puede
  // dispararse antes de que ese dato exista y dejar tenant_id/rol vacíos.
  // Por eso se fija acá también, de forma explícita, con el service_role.
  if (data.user) {
    await admin.from("profiles").update({ tenant_id: tenant.tenant_id, rol: "participante" }).eq("id", data.user.id);
  }

  return NextResponse.json({ ok: true, userId: data.user?.id });
}
