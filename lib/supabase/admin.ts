import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: BYPASSEA RLS. Usar SOLO del lado servidor y para
// operaciones del proveedor: alta de usuarios (setear app_metadata.tenant_id),
// webhooks de pago, y la app de super-admin. NUNCA importar en el cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
