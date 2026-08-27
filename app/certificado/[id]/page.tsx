import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyCertificate } from "@/lib/queries";

export const metadata = { title: "Certificado" };

export default async function CertificadoPage({ params }: { params: { id: string } }) {
  const cert = await verifyCertificate(params.id);
  if (!cert) notFound();

  const fecha = new Date(cert.fecha_emision).toLocaleDateString("es-AR", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const esPart = cert.tipo === "participacion";

  return (
    <div className="wrap" style={{ maxWidth: 860, paddingTop: 30, paddingBottom: 60 }}>
      <Link href="/mis-cursos" className="back">← Mis cursos</Link>

      <div className="certificate">
        {cert.academia_logo && (
          <img src={cert.academia_logo} alt="" style={{ maxHeight: 48, maxWidth: 200, objectFit: "contain", margin: "0 auto 10px", display: "block" }} />
        )}
        <div className="cert-org">{cert.academia} · {esPart ? "Constancia de participación" : "Certificación profesional"}</div>
        <div className="cert-kind">Se certifica que</div>
        <div className="cert-name">{cert.titular}</div>
        <div className="cert-rule" />
        <div className="cert-kind">
          {esPart ? "ha participado y completado el programa" : "ha completado y aprobado satisfactoriamente el programa"}
        </div>
        <div className="cert-course">{cert.curso}</div>
        <div className="cert-foot">
          {(cert.firmantes?.length ? cert.firmantes : [{ nombre: cert.academia, cargo: "Entidad emisora", firma_url: null }]).map(
            (s: any, i: number) => (
              <div className="cert-sign" key={i}>
                {s.firma_url ? <img className="cert-firma" src={s.firma_url} alt="" /> : <div className="cert-firma-ph" />}
                <div className="sign-line">{s.nombre}</div>
                {s.cargo}
              </div>
            )
          )}
          <div className="cert-id mono">
            <div>Emitido: {fecha}</div>
            <div>ID: {params.id}</div>
            {!esPart && cert.puntaje != null && <div>Puntaje: {cert.puntaje}%</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
        {/* PDF server-side: Fase 3 */}
        <a href={`/certificado/${params.id}/pdf`} target="_blank" rel="noopener" className="btn accent">Descargar PDF</a>
        <Link href={`/verificar?id=${params.id}`} className="btn ghost">Ver verificación pública</Link>
      </div>
    </div>
  );
}
