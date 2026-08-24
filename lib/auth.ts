import { createClient } from "@/lib/supabase/server";

export type Rol = "platform_admin" | "tenant_admin" | "instructor" | "participante";

export type UserContext = {
  userId: string;
  email: string | null;
  tenantId: string | null;
  rol: Rol;
};

// Lee el usuario y su contexto (tenant/rol) del JWT. El tenant_id y el rol
// viven en app_metadata: NO son editables por el cliente (los setea el alta
// con service_role). Por eso RLS puede confiar en ellos.
export async function getUserContext(): Promise<UserContext | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const meta = (user.app_metadata ?? {}) as { tenant_id?: string; rol?: Rol };
  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: meta.tenant_id ?? null,
    rol: meta.rol ?? "participante",
  };
}

export function isStaff(rol: Rol): boolean {
  return rol === "tenant_admin" || rol === "instructor";
}
