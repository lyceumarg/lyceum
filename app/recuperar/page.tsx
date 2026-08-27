"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-clave`,
    });
    setLoading(false);
    if (error) { setError("No se pudo enviar. Revisá el email e intentá de nuevo."); return; }
    setSent(true);
  }

  return (
    <div className="wrap">
      <form className="formwrap" onSubmit={enviar}>
        <span className="eyebrow">Tu cuenta</span>
        <h1>Recuperar contraseña</h1>
        {sent ? (
          <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
            Si el email está registrado, te enviamos un enlace para crear una nueva contraseña.
            Revisá tu casilla (y la carpeta de spam).
          </p>
        ) : (
          <>
            <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
              Ingresá tu email y te mandamos un enlace para restablecerla.
            </p>
            {error && <div className="msg err">{error}</div>}
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn accent block" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </button>
          </>
        )}
        <p className="muted-link"><Link href="/login">← Volver a ingresar</Link></p>
      </form>
    </div>
  );
}
