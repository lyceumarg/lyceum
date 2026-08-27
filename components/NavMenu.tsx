"use client";
import { useState } from "react";
import Link from "next/link";
import AuthButtons from "@/components/AuthButtons";
import type { Rol } from "@/lib/auth";

export default function NavMenu({ authed, rol }: { authed: boolean; rol: Rol | null }) {
  const [open, setOpen] = useState(false);
  const staff = rol === "tenant_admin" || rol === "instructor";
  const close = () => setOpen(false);

  const links = (
    <>
      <Link href="/" onClick={close}>Catálogo</Link>
      {authed && <Link href="/mis-cursos" onClick={close}>Mis cursos</Link>}
      {authed && <Link href="/perfil" onClick={close}>Mi perfil</Link>}
      {staff && <Link href="/panel" onClick={close}>Panel</Link>}
      <Link href="/verificar" onClick={close}>Verificar</Link>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <nav className="nav">
        {links}
        <AuthButtons authed={authed} />
      </nav>

      {/* Mobile: botón hamburguesa */}
      <button className="nav-burger" aria-label="Menú" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span /><span /><span />
      </button>

      {/* Mobile: panel desplegable */}
      {open && (
        <div className="nav-mobile">
          {links}
          <div className="nav-mobile-auth"><AuthButtons authed={authed} /></div>
        </div>
      )}
    </>
  );
}
