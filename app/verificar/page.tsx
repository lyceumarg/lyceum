"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Firmante = { nombre: string; cargo: string | null; firma_url: string | null };
type Cert = {
  titular: string;
  curso: string;
  academia: string;
  tipo: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: string;
  puntaje: number | null;
  firmantes: Firmante[];
};

function Verificador() {
  const params = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? "");
  const [cert, setCert] = useState<Cert | null>(null);
  const [estado, setEstado] = useState<"idle" | "loading" | "notfound">("idle");

  async function verificar(idPublico: string) {
    if (!idPublico.trim()) return;
    setEstado("loading");
    setCert(null);
    const { data } = await createClient().rpc("verify_certificate", { p_id_publico: idPublico.trim() });
    const found = (data?.[0] as Cert) ?? null;
    setCert(found);
    setEstado(found ? "idle" : "notfound");
  }

  useEffect(() => {
    if (params.get("id")) verificar(params.get("id")!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <div className="sec-head">
        <div>
          <span className="eyebrow">/verificar</span>
          <h2>Verificación de certificados</h2>
        </div>
      </div>

      <div className="card" style={{ padding: "24px 26px" }}>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
          Ingresá el ID del certificado para comprobar su validez. Cualquier persona puede verificar, sin cuenta.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            className="mono"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ABE-2026-XXXX"
            style={{ flex: 1, minWidth: 180, padding: "12px 14px", border: "1px solid var(--line-strong)", borderRadius: 4, fontSize: 14, background: "var(--surface)" }}
          />
          <button className="btn" onClick={() => verificar(id)} disabled={estado === "loading"}>
            {estado === "loading" ? "Verificando…" : "Verificar"}
          </button>
        </div>
        {estado === "notfound" && (
          <div className="msg err" style={{ marginTop: 16, marginBottom: 0 }}>
            No encontramos un certificado con ese ID.
          </div>
        )}
      </div>

      {cert && (
        <div className="card" style={{ marginTop: 18, padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <span className="pill valid">● {cert.estado === "valido" ? "Válido" : "Revocado"}</span>
            <div style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 18 }}>{cert.academia}</div>
          </div>
          <div className="vfield"><span className="k">Titular</span><span className="v">{cert.titular}</span></div>
          <div className="vfield"><span className="k">Programa</span><span className="v">{cert.curso}</span></div>
          <div className="vfield"><span className="k">Tipo</span><span className="v">{cert.tipo === "participacion" ? "Participación" : "Aprobación"}</span></div>
          {cert.tipo !== "participacion" && cert.puntaje != null && (
            <div className="vfield"><span className="k">Puntaje</span><span className="v">{cert.puntaje}%</span></div>
          )}
          <div className="vfield">
            <span className="k">Emisión</span>
            <span className="v">{new Date(cert.fecha_emision).toLocaleDateString("es-AR")}</span>
          </div>
          {!!cert.firmantes?.length && (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 16 }}>
              {cert.firmantes.map((s, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "var(--muted)" }}>
                  {s.firma_url && <img src={s.firma_url} alt="" style={{ display: "block", height: 34, objectFit: "contain", marginBottom: 3 }} />}
                  <strong style={{ color: "var(--ink)" }}>{s.nombre}</strong>{s.cargo ? ` · ${s.cargo}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VerificarPage() {
  return (
    <Suspense>
      <Verificador />
    </Suspense>
  );
}
