"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Instructor = {
  id: string;
  nombre: string;
  headline: string | null;
  bio: string | null;
  foto_url: string | null;
  linkedin_url: string | null;
};

export default function CapacitadoresManager({
  tenantId, initial, cursosPorInstructor,
}: {
  tenantId: string;
  initial: Instructor[];
  cursosPorInstructor: Record<string, string[]>;
}) {
  const supabase = createClient();
  const [lista, setLista] = useState<Instructor[]>(initial);
  const [editando, setEditando] = useState<string | null>(null); // id o "nuevo"
  const [form, setForm] = useState({ nombre: "", headline: "", bio: "", linkedin_url: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function abrirNuevo() {
    setForm({ nombre: "", headline: "", bio: "", linkedin_url: "" });
    setFile(null); setErr(null); setEditando("nuevo");
  }
  function abrirEditar(i: Instructor) {
    setForm({ nombre: i.nombre, headline: i.headline ?? "", bio: i.bio ?? "", linkedin_url: i.linkedin_url ?? "" });
    setFile(null); setErr(null); setEditando(i.id);
  }

  async function guardar() {
    if (!form.nombre.trim()) { setErr("El nombre es obligatorio."); return; }
    setBusy(true); setErr(null);
    try {
      let foto_url: string | null = lista.find((i) => i.id === editando)?.foto_url ?? null;
      if (file) {
        const path = `${tenantId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const up = await supabase.storage.from("instructores").upload(path, file, { upsert: true });
        if (up.error) { setErr("No se pudo subir la foto: " + up.error.message); setBusy(false); return; }
        foto_url = supabase.storage.from("instructores").getPublicUrl(path).data.publicUrl;
      }
      const payload = {
        nombre: form.nombre.trim(),
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        foto_url,
      };

      if (editando === "nuevo") {
        const { data, error } = await supabase.from("instructores").insert({ tenant_id: tenantId, ...payload }).select().single();
        if (error) { setErr(error.message); setBusy(false); return; }
        setLista([...lista, data as Instructor].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      } else {
        const { data, error } = await supabase.from("instructores").update(payload).eq("id", editando).select().single();
        if (error) { setErr(error.message); setBusy(false); return; }
        setLista(lista.map((i) => (i.id === editando ? (data as Instructor) : i)).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }
      setEditando(null);
    } finally {
      setBusy(false);
    }
  }

  async function borrar(i: Instructor) {
    const cursos = cursosPorInstructor[i.id] ?? [];
    const aviso = cursos.length
      ? `"${i.nombre}" dicta ${cursos.length} curso(s) (${cursos.join(", ")}). Se va a desvincular de ellos, pero los cursos quedan intactos. ¿Eliminar de todas formas?`
      : `¿Eliminar a "${i.nombre}"?`;
    if (!confirm(aviso)) return;
    const { error } = await supabase.from("instructores").delete().eq("id", i.id);
    if (error) { alert("No se pudo eliminar: " + error.message); return; }
    setLista(lista.filter((x) => x.id !== i.id));
  }

  return (
    <div>
      <div className="panel-head" style={{ marginBottom: 16 }}>
        <span />
        <button className="btn accent" onClick={abrirNuevo}>+ Nuevo capacitador</button>
      </div>

      {editando && (
        <div className="card" style={{ padding: 20, marginBottom: 20, background: "var(--surface-2, #fafafa)" }}>
          <h3 style={{ fontSize: 15, marginBottom: 14 }}>{editando === "nuevo" ? "Nuevo capacitador" : "Editar capacitador"}</h3>
          {err && <div className="msg err">{err}</div>}
          <label className="ed-lab">Nombre y apellido</label>
          <input className="ed-inp" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <label className="ed-lab">Headline (ej. Especialista en PLAFTFP · ex-BCRA)</label>
          <input className="ed-inp" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          <label className="ed-lab">Bio corta</label>
          <textarea className="ed-inp" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <label className="ed-lab">LinkedIn (opcional)</label>
          <input className="ed-inp" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
          <label className="ed-lab">Foto</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn accent" onClick={guardar} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
            <button className="btn ghost" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {lista.length ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {lista.map((i, idx) => (
            <div key={i.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderTop: idx ? "1px solid var(--line)" : "none" }}>
              {i.foto_url ? (
                <img src={i.foto_url} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <span style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--soft)", color: "var(--indigo)", display: "grid", placeItems: "center", fontWeight: 700 }}>
                  {i.nombre.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{i.nombre}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {i.headline || "Sin headline"} · {(cursosPorInstructor[i.id] ?? []).length} curso(s)
                </div>
              </div>
              <button className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => abrirEditar(i)}>Editar</button>
              <button className="btn ghost danger" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => borrar(i)}>Eliminar</button>
            </div>
          ))}
        </div>
      ) : (
        !editando && <div className="card empty">Todavía no cargaste capacitadores.</div>
      )}
    </div>
  );
}
