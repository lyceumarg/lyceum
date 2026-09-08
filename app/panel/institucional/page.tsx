import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserContext } from "@/lib/auth";
import BrandingEditor from "@/components/panel/BrandingEditor";
import CategoriasManager from "@/components/panel/CategoriasManager";
import StaffManager from "@/components/panel/StaffManager";

export const metadata = { title: "Institucional" };

export default async function InstitucionalPage() {
  const user = await getUserContext();
  if (!user) redirect("/login");
  const supabase = createClient();

  const { data: b } = await supabase
    .from("tenant_branding")
    .select("nombre_academia, color_primario, logo_url, powered_by")
    .eq("tenant_id", user.tenantId)
    .single();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre")
    .eq("tenant_id", user.tenantId)
    .order("nombre");

  const { data: admins } = await supabase
    .from("profiles")
    .select("id, nombre, email")
    .eq("tenant_id", user.tenantId)
    .eq("rol", "tenant_admin")
    .order("nombre");

  return (
    <>
      <div className="panel-head">
        <div>
          <span className="eyebrow">Consola de la academia</span>
          <h2 style={{ fontSize: 26 }}>Institucional</h2>
        </div>
      </div>
      <BrandingEditor
        tenantId={user.tenantId!}
        initial={{
          nombre_academia: b?.nombre_academia ?? "",
          color_primario: b?.color_primario ?? "#1f5c9c",
          logo_url: b?.logo_url ?? null,
          powered_by: b?.powered_by ?? true,
        }}
      />
      <div style={{ marginTop: 20 }}>
        <CategoriasManager tenantId={user.tenantId!} initial={categorias ?? []} />
      </div>
      <div style={{ marginTop: 20 }}>
        <StaffManager tenantId={user.tenantId!} initial={admins ?? []} miPropioId={user.userId} />
      </div>
    </>
  );
}
