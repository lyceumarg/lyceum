"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PerfilEditor({ nombre: nombreInicial, email }: { nombre: string; email: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [pmsg, setPmsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function guardarDatos() {
    setSaving(true); setMsg(null);
    const { error: e1 } = await supabase.from("profiles").update({ nombre }).eq("id", (await supabase.auth.getUser()).data.user?.id);
    await supabase.auth.updateUser({ data: { nombre } }); // mantener el metadata en sync
    setSaving(false);
    setMsg(e1 ? { ok: false, t: "No se pudo guardar." } : { ok: true, t: "Datos actualizados." });
    if (!e1) router.refresh();
  }

  async function cambiarPass() {
    setPmsg(null);
    if (pass.length < 8) return setPmsg({ ok: false, t: "La contraseña debe tener al menos 8 caracteres." });
    if (pass !== pass2) return setPmsg({ ok: false, t: "Las contraseñas no coinciden." });
    const { error } = await supabase.auth.updateUser({ password: pass });
    if (error) return setPmsg({ ok: false, t: "No se pudo cambiar: " + error.message });
    setPass(""); setPass2("");
    setPmsg({ ok: true, t: "Contraseña actualizada." });
  }

  return (
    <>
      <div className="card" style={{ padding: 22, marginBottom: 18 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Datos personales</h2>
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`} style={{ marginBottom: 12 }}>{msg.t}</div>}
        <div className="field">
          <label>Nombre y apellido</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre completo" />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={email} disabled style={{ opacity: 0.7 }} />
        </div>
        <button className="btn accent" onClick={guardarDatos} disabled={saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
          El nombre es el que figura en tus certificados.
        </p>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Cambiar contraseña</h2>
        {pmsg && <div className={`msg ${pmsg.ok ? "ok" : "err"}`} style={{ marginBottom: 12 }}>{pmsg.t}</div>}
        <div className="field">
          <label>Nueva contraseña</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} minLength={8} />
        </div>
        <div className="field">
          <label>Repetir contraseña</label>
          <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} minLength={8} />
        </div>
        <button className="btn ghost" onClick={cambiarPass}>Actualizar contraseña</button>
      </div>
    </>
  );
}
