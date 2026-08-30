import { redirect } from "next/navigation";
import { getUserContext, isStaff } from "@/lib/auth";
import { getTenantByHost } from "@/lib/tenant";
import SideNav from "@/components/panel/SideNav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserContext();
  if (!user) redirect("/login");
  if (!isStaff(user.rol)) redirect("/");

  const tenant = await getTenantByHost();
  const nombre = tenant?.nombre_academia ?? "Academia";
  const iniciales = nombre.replace(/^academia\s+/i, "").trim().slice(0, 2).toUpperCase();

  return (
    <div className="admin">
      <SideNav nombre={nombre} logoUrl={tenant?.logo_url ?? null} iniciales={iniciales} />
      <div className="main">{children}</div>
    </div>
  );
}
