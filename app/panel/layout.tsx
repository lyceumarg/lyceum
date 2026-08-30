import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext, isStaff } from "@/lib/auth";
import { getTenantByHost } from "@/lib/tenant";
import LyceumMark from "@/components/LyceumMark";
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
      <div className="sidenav">
        <div className="logo">
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "contain" }} />
          ) : (
            <span className="m">{iniciales}</span>
          )}
          {nombre}
        </div>

        <SideNav />

        <div className="side-sep" />
        <Link href="/" className="side-link">↩ Ver mi academia</Link>

        <div className="side-foot">
          <LyceumMark size={12} />
          Powered by Lyceum
        </div>
      </div>
      <div className="main">{children}</div>
    </div>
  );
}
