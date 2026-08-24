import Link from "next/link";
import AuthButtons from "@/components/AuthButtons";
import type { Rol } from "@/lib/auth";

function iniciales(nombre: string) {
  const s = nombre.replace(/^academia\s+/i, "").trim();
  return ((s[0] ?? "A") + (s[1] ?? "")).toUpperCase();
}

export default function Topbar({
  academia,
  logoUrl,
  authed,
  rol,
}: {
  academia: string;
  logoUrl: string | null;
  authed: boolean;
  rol: Rol | null;
}) {
  const staff = rol === "tenant_admin" || rol === "instructor";
  return (
    <header className="topbar">
      <div className="topbar-in">
        <Link href="/" className="brand">
          {logoUrl ? (
            <span className="chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" />
            </span>
          ) : (
            <span className="dot">{iniciales(academia)}</span>
          )}
          <span>{academia}</span>
        </Link>
        <nav className="nav">
          <Link href="/">Catálogo</Link>
          {authed && <Link href="/mis-cursos">Mis cursos</Link>}
          {staff && <Link href="/panel">Panel</Link>}
          <Link href="/verificar">Verificar</Link>
          <AuthButtons authed={authed} />
        </nav>
      </div>
    </header>
  );
}
