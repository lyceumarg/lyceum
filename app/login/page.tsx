"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("No pudimos ingresar. Revisá el email y la contraseña.");
      return;
    }
    router.push("/mis-cursos");
    router.refresh();
  }

  return (
    <div className="wrap">
      <form className="formwrap" onSubmit={ingresar}>
        <span className="eyebrow">Tu cuenta</span>
        <h1>Ingresar</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
          Accedé a tus cursos y certificados.
        </p>
        {error && <div className="msg err">{error}</div>}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn accent block" disabled={loading}>
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
        <p className="muted-link">
          <Link href="/recuperar">¿Olvidaste tu contraseña?</Link>
        </p>
        <p className="muted-link">
          ¿No tenés cuenta? <Link href="/registro">Registrate</Link>
        </p>
      </form>
    </div>
  );
}
