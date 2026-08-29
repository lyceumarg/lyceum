import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getUserContext, isStaff } from "@/lib/auth";
import { getTenantByHost } from "@/lib/tenant";
import LyceumMark from "@/components/LyceumMark";

function SideLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`side-link${active ? " on" : ""}`}>
      {children}
    </Link>
  );
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserContext();
  if (!user) redirect("/login");
  if (!isStaff(user.rol)) redirect("/");

  const tenant = await getTenantByHost();
  const nombre = tenant?.nombre_academia ?? "Academia";
  const iniciales = nombre.replace(/^academia\s+/i, "").trim().slice(0, 2).toUpperCase();
  const path = headers().get("x-pathname") || "/panel";

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

        <SideLink href="/panel" active={path === "/panel" || path.startsWith("/panel/cursos")}>📚 Cursos</SideLink>
        <SideLink href="/panel/capacitadores" active={path.startsWith("/panel/capacitadores")}>🎓 Capacitadores</SideLink>
        <SideLink href="/panel/participantes" active={path.startsWith("/panel/participantes")}>👥 Participantes</SideLink>
        <SideLink href="/panel/ganancias" active={path.startsWith("/panel/ganancias")}>💵 Ganancias</SideLink>
        <SideLink href="/panel/institucional" active={path.startsWith("/panel/institucional")}>🏷 Institucional</SideLink>

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
