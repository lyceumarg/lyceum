"use client";
import { usePathname } from "next/navigation";
import Topbar from "@/components/Topbar";
import PoweredBy from "@/components/PoweredBy";
import type { Rol } from "@/lib/auth";

// El layout raíz de Next.js NO se vuelve a ejecutar en cada navegación con
// <Link> (persiste durante toda la sesión) — decidir "mostrar Topbar" ahí
// con datos calculados una sola vez dejaba el Topbar público pegado en
// pantalla al entrar al panel con un clic (mismo síntoma que ya arreglamos
// una vez para el resaltado del menú del panel). Por eso esta decisión vive
// acá, en un Client Component con usePathname(), que sí se actualiza en
// cada click.
export default function SiteChrome({
  academia, logoUrl, authed, rol, children,
}: {
  academia: string; logoUrl: string | null; authed: boolean; rol: Rol | null; children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const inPanel = pathname.startsWith("/panel");

  if (inPanel) return <>{children}</>; // el panel pone su propio chrome (sidenav)

  return (
    <>
      <Topbar academia={academia} logoUrl={logoUrl} authed={authed} rol={rol} />
      <main>{children}</main>
      <footer className="foot wrap">
        {academia} · Certificaciones con verificación pública
        <PoweredBy />
      </footer>
    </>
  );
}
