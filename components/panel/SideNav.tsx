"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import LyceumMark from "@/components/LyceumMark";

type LinkDef = { href: string; label: string; match: (path: string) => boolean };

const LINKS: LinkDef[] = [
  { href: "/panel", label: "📚 Cursos", match: (p) => p === "/panel" || p.startsWith("/panel/cursos") },
  { href: "/panel/capacitadores", label: "🎓 Capacitadores", match: (p) => p.startsWith("/panel/capacitadores") },
  { href: "/panel/participantes", label: "👥 Participantes", match: (p) => p.startsWith("/panel/participantes") },
  { href: "/panel/ganancias", label: "💵 Ganancias", match: (p) => p.startsWith("/panel/ganancias") },
  { href: "/panel/institucional", label: "🏷 Institucional", match: (p) => p.startsWith("/panel/institucional") },
];

// Client Component: en desktop es la barra lateral fija de siempre; en
// mobile se convierte en una franja superior compacta con un botón que
// despliega el mismo menú (sin motion, coherente con el resto del panel).
export default function SideNav({
  nombre, logoUrl, iniciales,
}: { nombre: string; logoUrl: string | null; iniciales: string }) {
  const pathname = usePathname() || "/panel";
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="sidenav">
      <div className="sidenav-top">
        <div className="logo">
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "contain" }} />
          ) : (
            <span className="m">{iniciales}</span>
          )}
          {nombre}
        </div>
        <button className="panel-burger" onClick={() => setOpen((v) => !v)} aria-label="Menú" aria-expanded={open}>
          <span /><span /><span />
        </button>
      </div>

      <div className={`sidenav-links${open ? " open" : ""}`}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`side-link${l.match(pathname) ? " on" : ""}`} onClick={close}>
            {l.label}
          </Link>
        ))}
        <div className="side-sep" />
        <Link href="/" className="side-link" onClick={close}>↩ Ver mi academia</Link>
        <div className="side-foot">
          <LyceumMark size={12} />
          Powered by Lyceum
        </div>
      </div>
    </div>
  );
}
