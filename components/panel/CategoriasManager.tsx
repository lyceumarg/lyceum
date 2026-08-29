"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Categoria = { id: string; nombre: string };

export default function CategoriasManager({ tenantId, initial }: { tenantId: string; initial: Categoria[] }) {
  const supabase = createClient();
  const [lista, setLista] = useState<Categoria[]>(initial);
  const [nueva, setNueva] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function agregar() {
    const nombre = nueva.trim();
    if (!nombre) return;
    if (lista.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      setErr("Esa categoría ya existe.");
      return;
    }
    setBusy(true); setErr(null);
    const { data, error } = await supabase.from("categorias").insert({ tenant_id: tenantId, nombre }).select().single();
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setLista([...lista, data as Categoria].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setNueva("");
  }

  async function quitar(c: Categoria) {
    if (!confirm(`¿Quitar "${c.nombre}" de la lista? Los cursos que ya la tengan asignada no se modifican.`)) return;
    const { error } = await supabase.from("categorias").delete().eq("id", c.id);
    if (error) { alert("No se pudo quitar: " + error.message); return; }
    setLista(lista.filter((x) => x.id !== c.id));
  }

  return (
    <div className="card" style={{ padding: 22 }}>
      <h3 style={{ fontSize: 15, marginBottom: 4 }}>Categorías de curso</h3>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 0, marginBottom: 14 }}>
        La lista que ven tus editores al elegir la categoría de un curso.
      </p>
      {err && <div className="msg err">{err}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {lista.map((c) => (
          <span key={c.id} className="pill" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            {c.nombre}
            <button onClick={() => quitar(c)} style={{ color: "var(--muted)", fontWeight: 700, lineHeight: 1 }} aria-label={`Quitar ${c.nombre}`}>×</button>
          </span>
        ))}
        {!lista.length && <span style={{ fontSize: 13, color: "var(--muted)" }}>Todavía no hay categorías cargadas.</span>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="ed-inp" style={{ margin: 0, flex: 1 }}
          placeholder="Nueva categoría (ej. Compliance · Banca)"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && agregar()}
        />
        <button className="btn accent" onClick={agregar} disabled={busy || !nueva.trim()}>Agregar</button>
      </div>
    </div>
  );
}
