"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type LinkDef = { href: string; label: string; match: (path: string) => boolean };

const LINKS: LinkDef[] = [
  { href: "/panel", label: "📚 Cursos", match: (p) => p === "/panel" || p.startsWith("/panel/cursos") },
  { href: "/panel/capacitadores", label: "🎓 Capacitadores", match: (p) => p.startsWith("/panel/capacitadores") },
  { href: "/panel/participantes", label: "👥 Participantes", match: (p) => p.startsWith("/panel/participantes") },
  { href: "/panel/ganancias", label: "💵 Ganancias", match: (p) => p.startsWith("/panel/ganancias") },
  { href: "/panel/institucional", label: "🏷 Institucional", match: (p) => p.startsWith("/panel/institucional") },
];

// Client Component a propósito: usePathname() se actualiza en cada
// navegación. El layout del panel es un Server Component que NO se vuelve
// a ejecutar entre páginas hermanas, así que calcular ahí "cuál está activa"
// queda pegado en la sección anterior hasta un refresh completo.
export default function SideNav() {
  const pathname = usePathname() || "/panel";
  return (
    <>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`side-link${l.match(pathname) ? " on" : ""}`}>
          {l.label}
        </Link>
      ))}
    </>
  );
}
