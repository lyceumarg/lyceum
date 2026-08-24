import type { Metadata } from "next";
import { getTenantByHost, isPlatformHost } from "@/lib/tenant";
import { getUserContext } from "@/lib/auth";
import Topbar from "@/components/Topbar";
import PoweredBy from "@/components/PoweredBy";
import "./globals.css";

// El título lleva SOLO la marca del tenant. Nada de la plataforma.
export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantByHost();
  const name = tenant?.nombre_academia ?? "Academia";
  return { title: { default: name, template: `%s · ${name}` } };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenantByHost();
  const user = await getUserContext();
  const accent = tenant?.color_primario ?? "#1f5c9c";

  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ ["--accent" as string]: accent }}>
        {/* Si el host no corresponde a ninguna academia (y no es la plataforma),
            no mostramos marca genérica: el children resuelve el caso. */}
        {tenant && (
          <Topbar
            academia={tenant.nombre_academia}
            logoUrl={tenant.logo_url}
            authed={!!user}
            rol={user?.rol ?? null}
          />
        )}
        <main>{children}</main>
        {tenant && (
          <footer className="foot wrap">
            {tenant.nombre_academia} · Certificaciones con verificación pública
            <PoweredBy enabled={tenant.powered_by} />
          </footer>
        )}
      </body>
    </html>
  );
}
