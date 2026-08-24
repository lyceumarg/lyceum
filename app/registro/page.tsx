"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // El tenant se resuelve por host en el servidor; el cliente no lo elige.
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      setLoading(false);
      setError(error || "No pudimos crear la cuenta.");
      return;
    }
    // Alta ok -> ingresar.
    await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    router.push("/mis-cursos");
    router.refresh();
  }

  return (
    <div className="wrap">
      <form className="formwrap" onSubmit={registrar}>
        <span className="eyebrow">Tu cuenta</span>
        <h1>Crear cuenta</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 24 }}>
          Registrate para cursar y certificarte.
        </p>
        {error && <div className="msg err">{error}</div>}
        <div className="field">
          <label>Nombre y apellido</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </div>
        <button className="btn accent block" disabled={loading}>
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
        <p className="muted-link">
          ¿Ya tenés cuenta? <Link href="/login">Ingresá</Link>
        </p>
      </form>
    </div>
  );
}
