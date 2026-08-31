import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Tenant = {
  tenant_id: string;
  nombre_academia: string;
  logo_url: string | null;
  color_primario: string;
  powered_by: boolean;
};

// Host actual de la request (el proxy/Vercel setea x-forwarded-host).
export function currentHost(): string {
  const h = headers();
  return (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase();
}

// "www.x" y "x" se tratan como el mismo host de plataforma — evita que un
// desvío de "www." entre lo cargado en PLATFORM_HOST y lo que el visitante
// tipeó rompa la detección del Sitio A (ya nos pasó una vez).
function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

export function isPlatformHost(host = currentHost()): boolean {
  const platform = (process.env.PLATFORM_HOST || "").toLowerCase();
  return !!platform && stripWww(host) === stripWww(platform);
}

// Resuelve el tenant a partir del host, vía RPC security definer (salida mínima).
// Devuelve null si el host no corresponde a ninguna academia activa.
export async function getTenantByHost(host = currentHost()): Promise<Tenant | null> {
  if (!host || isPlatformHost(host)) return null;
  const supabase = createClient();
  const { data, error } = await supabase.rpc("branding_by_host", { p_host: host });
  if (error || !data || data.length === 0) return null;
  return data[0] as Tenant;
}
