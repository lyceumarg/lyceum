"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LyceumMark from "@/components/LyceumMark";
import { scrambleText } from "@/lib/motion";

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
  const titularRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);

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

  useEffect(() => {
    if (!cert) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    checkRef.current?.classList.remove("draw");
    scrambleText(titularRef.current, cert.titular, () => checkRef.current?.classList.add("draw"), reduce);
  }, [cert]);

  return (
    <div className="wrap">
      <div className="verify-hero">
        <span className="eyebrow" style={{ justifyContent: "center" }}>Verificación pública</span>
        <h1 style={{ fontSize: "clamp(28px,4.4vw,40px)", marginTop: 14 }}>Comprobá cualquier credencial.</h1>
        <p style={{ color: "var(--muted)", marginTop: 16 }}>
          Ingresá el identificador del certificado. No hace falta cuenta.
        </p>
        <span className="lyceum-credit">
          <LyceumMark size={14} />
          Verificación impulsada por Lyceum
        </span>
      </div>

      <div className="verify-box">
        <div className="vform light">
          <input
            className="mono"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="ABE-2026-XXXX"
            onKeyDown={(e) => e.key === "Enter" && verificar(id)}
          />
          <button className="btn sm" onClick={() => verificar(id)} disabled={estado === "loading"}>
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
        <div className="verify-result">
          <span className="status-pill">
            <svg ref={checkRef} className="check" viewBox="0 0 24 24" width="14" height="14">
              <path d="M5 12.5l4 4L19 7" stroke="#12795a" />
            </svg>
            {cert.estado === "valido" ? "Válido" : "Revocado"}
          </span>
          <div className="vfield"><span className="k">Titular</span><span className="v" ref={titularRef}></span></div>
          <div className="vfield"><span className="k">Academia</span><span className="v">{cert.academia}</span></div>
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
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
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
