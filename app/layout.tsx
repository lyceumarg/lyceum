import type { Metadata } from "next";
import { getTenantByHost, isPlatformHost } from "@/lib/tenant";
import { getUserContext } from "@/lib/auth";
import SiteChrome from "@/components/SiteChrome";
import MotionFX from "@/components/motion/MotionFX";
import "./globals.css";

// El título de cada academia lleva SOLO su propia marca. En el host de
// plataforma (Sitio A) se usa el título de Lyceum. El favicon sí es el
// isotipo de Lyceum (sello + check): con "Powered by Lyceum" siempre
// visible, es consistente que el ícono de pestaña también lo sea.
const FAVICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="68" fill="#2a2f77"/>
      <path d="M42 72 l18 18 38 -44" fill="none" stroke="#ffffff" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  );

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantByHost();
  if (!tenant && isPlatformHost()) {
    return {
      title: { default: "Lyceum — Plataforma de academias con certificación", template: "%s · Lyceum" },
      icons: { icon: FAVICON },
    };
  }
  const name = tenant?.nombre_academia ?? "Academia";
  return {
    title: { default: name, template: `%s · ${name}` },
    icons: { icon: FAVICON },
  };
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
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ ["--accent" as string]: accent }}>
        <MotionFX />
        {tenant ? (
          <SiteChrome academia={tenant.nombre_academia} logoUrl={tenant.logo_url} authed={!!user} rol={user?.rol ?? null}>
            {children}
          </SiteChrome>
        ) : (
          <main>{children}</main>
        )}
      </body>
    </html>
  );
}
