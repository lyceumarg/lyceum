"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Admin = { id: string; nombre: string | null; email: string | null };

export default function StaffManager({
  tenantId, initial, miPropioId,
}: { tenantId: string; initial: Admin[]; miPropioId: string }) {
  const supabase = createClient();
  const [lista, setLista] = useState<Admin[]>(initial);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function agregar() {
    const correo = email.trim().toLowerCase();
    if (!correo) return;
    setErr(null);
    if (lista.some((a) => a.email?.toLowerCase() === correo)) {
      setErr("Esa persona ya es administradora.");
      return;
    }
    setBusy(true);
    const { data: persona, error: errBuscar } = await supabase
      .from("profiles")
      .select("id, nombre, email")
      .eq("tenant_id", tenantId)
      .ilike("email", correo)
      .maybeSingle();
    if (errBuscar) { setBusy(false); setErr(errBuscar.message); return; }
    if (!persona) {
      setBusy(false);
      setErr("Esa persona todavía no tiene una cuenta en tu academia — pedile que se registre primero, y después agregala de nuevo acá.");
      return;
    }
    const { error: errUpdate } = await supabase.from("profiles").update({ rol: "tenant_admin" }).eq("id", persona.id);
    setBusy(false);
    if (errUpdate) { setErr(errUpdate.message); return; }
    setLista([...lista, persona as Admin]);
    setEmail("");
  }

  async function quitar(a: Admin) {
    if (lista.length <= 1) {
      alert("No podés quitar al único administrador de la academia — agregá otro primero.");
      return;
    }
    const nombre = a.nombre || a.email || "esta persona";
    if (!confirm(`¿Quitarle el rol de administrador a ${nombre}? Va a pasar a tener una cuenta normal de participante.`)) return;
    const { error } = await supabase.from("profiles").update({ rol: "participante" }).eq("id", a.id);
    if (error) { alert("No se pudo quitar: " + error.message); return; }
    setLista(lista.filter((x) => x.id !== a.id));
  }

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ fontSize: 15, marginBottom: 4 }}>Administradores</h3>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 0, marginBottom: 14 }}>
        Tienen acceso completo al panel. La persona tiene que registrarse primero en el sitio — acá solo le subís el rol.
      </p>
      {err && <div className="msg err">{err}</div>}
      <div style={{ marginBottom: 14 }}>
        {lista.map((a) => (
          <div key={a.id} className="blk-row">
            <span className="t" style={{ flex: 1, fontWeight: 600, color: "var(--ink)" }}>
              {a.nombre || "—"}{a.id === miPropioId && <span style={{ fontWeight: 400, color: "var(--muted)" }}> (vos)</span>}
            </span>
            <span className="t" style={{ flex: 1 }}>{a.email}</span>
            <button className="tx" title="Quitar como administrador" onClick={() => quitar(a)}>✕</button>
          </div>
        ))}
        {!lista.length && <p style={{ fontSize: 13, color: "var(--muted)" }}>No hay administradores cargados.</p>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="ed-inp" style={{ margin: 0, flex: 1 }}
          placeholder="Email de la persona (ya registrada en el sitio)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
        />
        <button className="btn accent" onClick={agregar} disabled={busy || !email.trim()}>
          {busy ? "Agregando…" : "Agregar"}
        </button>
      </div>
    </div>
  );
}
