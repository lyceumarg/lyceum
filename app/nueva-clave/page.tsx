"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevaClavePage() {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // El enlace del email trae una sesión de recuperación; el cliente la procesa.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pass.length < 8) return setMsg({ ok: false, t: "Mínimo 8 caracteres." });
    if (pass !== pass2) return setMsg({ ok: false, t: "Las contraseñas no coinciden." });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) return setMsg({ ok: false, t: "No se pudo actualizar: " + error.message });
    setMsg({ ok: true, t: "¡Listo! Contraseña actualizada. Redirigiendo…" });
    setTimeout(() => { router.push("/mis-cursos"); router.refresh(); }, 1200);
  }

  return (
    <div className="wrap">
      <form className="formwrap" onSubmit={guardar}>
        <span className="eyebrow">Tu cuenta</span>
        <h1>Nueva contraseña</h1>
        {!ready && (
          <div className="msg err" style={{ marginTop: 8 }}>
            Este enlace no es válido o expiró. Volvé a pedir el reseteo desde “Recuperar contraseña”.
          </div>
        )}
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`}>{msg.t}</div>}
        <div className="field">
          <label>Nueva contraseña</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={8} required disabled={!ready} />
        </div>
        <div className="field">
          <label>Repetir contraseña</label>
          <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} minLength={8} required disabled={!ready} />
        </div>
        <button className="btn accent block" disabled={loading || !ready}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
