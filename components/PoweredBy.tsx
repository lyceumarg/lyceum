"use client";
import { usePathname } from "next/navigation";

// "Powered by Lyceum" opcional (flag powered_by, derivado del plan del tenant).
// Regla dura de aislamiento de marca: NO se muestra en el certificado ni en la
// verificación pública, que llevan solo la autoridad de la academia emisora.
export default function PoweredBy({ enabled }: { enabled: boolean }) {
  const path = usePathname() || "";
  if (!enabled) return null;
  if (path.startsWith("/verificar") || path.startsWith("/certificado")) return null;

  return (
    <>
      {" · "}
      <a href="https://lyceum.com" target="_blank" rel="noopener" style={{ color: "var(--muted)" }}>
        Powered by Lyceum
      </a>
    </>
  );
}
