"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Initial = {
  nombre_academia: string;
  color_primario: string;
  logo_url: string | null;
  powered_by: boolean;
};

export default function BrandingEditor({ tenantId, initial }: { tenantId: string; initial: Initial }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(initial.nombre_academia);
  const [color, setColor] = useState(initial.color_primario);
  const [logo, setLogo] = useState<string | null>(initial.logo_url);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function subirLogo(file: File) {
    setMsg(null);
    const ext = file.name.split(".").pop() || "png";
    const path = `${tenantId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) { setMsg({ ok: false, t: "No se pudo subir el logo: " + error.message }); return; }
    const url = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
    setLogo(url);
    // persistir de una, para que el logo quede aunque no toque "Guardar"
    await supabase.from("tenant_branding").update({ logo_url: url }).eq("tenant_id", tenantId);
    setMsg({ ok: true, t: "Logo actualizado." });
  }

  async function guardar() {
    setSaving(true); setMsg(null);
    const { error } = await supabase
      .from("tenant_branding")
      .update({ nombre_academia: nombre, color_primario: color, logo_url: logo })
      .eq("tenant_id", tenantId);
    setSaving(false);
    setMsg(error ? { ok: false, t: "Error al guardar: " + error.message } : { ok: true, t: "Cambios guardados. Recargá la academia para verlos." });
  }

  return (
    <div className="ed-grid" style={{ gridTemplateColumns: "1fr 320px" }}>
      <div className="card" style={{ padding: 22 }}>
        {msg && <div className={`msg ${msg.ok ? "ok" : "err"}`} style={{ marginBottom: 14 }}>{msg.t}</div>}

        <label className="ed-lab">Nombre de la academia</label>
        <input className="ed-inp" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <label className="ed-lab" style={{ marginTop: 10 }}>Color principal</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 46, height: 38, border: "1px solid var(--line-strong)", borderRadius: 8, background: "none" }} />
          <input className="ed-inp" style={{ margin: 0, maxWidth: 140 }} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>

        <label className="ed-lab" style={{ marginTop: 14 }}>Logo</label>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 0, marginBottom: 8 }}>
          PNG o SVG, preferentemente sobre fondo transparente. Se usa en la barra de la academia y en el certificado.
        </p>
        <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) subirLogo(f); }} />

        <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button className="btn" onClick={guardar} disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </div>

        <div style={{ marginTop: 16, fontSize: 12.5, color: "var(--muted)" }}>
          Todas las academias incluyen <strong>“Powered by Lyceum”</strong> en el pie de página.
        </div>
      </div>

      {/* preview */}
      <div className="card" style={{ padding: 0, overflow: "hidden", alignSelf: "start" }}>
        <div style={{ background: color, padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          {logo
            ? <img src={logo} alt="" style={{ height: 30, maxWidth: 140, objectFit: "contain" }} />
            : <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,.25)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>
                {nombre.slice(0, 2).toUpperCase()}
              </div>}
          <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>{nombre || "Academia"}</span>
        </div>
        <div style={{ padding: 16, fontSize: 12.5, color: "var(--muted)" }}>Vista previa de la barra superior</div>
      </div>
    </div>
  );
}
