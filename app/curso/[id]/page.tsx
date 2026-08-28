import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseDetail } from "@/lib/queries";
import EnrollButton from "./EnrollButton";
import LyceumMark from "@/components/LyceumMark";

type Capacitador = {
  nombre: string;
  headline: string | null;
  bio: string | null;
  foto_url: string | null;
  linkedin_url: string | null;
};
type Detail = {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  categoria: string | null;
  corte: number;
  modulos: { titulo: string; lecciones: string[] | null }[];
  capacitador: Capacitador | null;
};

export default async function CursoPage({ params }: { params: { id: string } }) {
  const detail = (await getCourseDetail(params.id)) as Detail | null;
  if (!detail) notFound();

  return (
    <div className="wrap">
      <Link href="/" className="back">← Volver al catálogo</Link>
      <div className="detail-grid">
        <div>
          {detail.categoria && <span className="eyebrow t">{detail.categoria}</span>}
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 14px" }}>{detail.titulo}</h1>
          <p style={{ color: "var(--muted)", fontSize: 15.5, maxWidth: "60ch" }}>{detail.descripcion}</p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <span className="pill t">{detail.modulos.length} módulos</span>
            <span className="pill t">Examen certificante · corte {detail.corte}%</span>
          </div>
          <span className="lyceum-credit">
            <LyceumMark size={14} />
            Certificación verificable · tecnología Lyceum
          </span>

          <h3 style={{ fontSize: 19, margin: "26px 0 14px" }}>Contenido del programa</h3>
          {detail.modulos.map((m, i) => (
            <div className="mod" key={i}>
              <span className="idx">M{String(i + 1).padStart(2, "0")}</span>
              <span>{m.titulo}</span>
              <span className="cnt">{m.lecciones?.length ?? 0} lecciones</span>
            </div>
          ))}

          {detail.capacitador && (
            <div className="card instr-card" style={{ marginTop: 26 }}>
              <span className="eyebrow">Dictado por</span>
              <div className="instr-head">
                {detail.capacitador.foto_url
                  ? <img src={detail.capacitador.foto_url} alt={detail.capacitador.nombre} />
                  : <span className="ph">{detail.capacitador.nombre.slice(0, 1).toUpperCase()}</span>}
                <div>
                  <h4>{detail.capacitador.nombre}</h4>
                  {detail.capacitador.headline && <p className="instr-headline">{detail.capacitador.headline}</p>}
                </div>
              </div>
              {detail.capacitador.bio && <p className="instr-bio">{detail.capacitador.bio}</p>}
              {detail.capacitador.linkedin_url && (
                <a href={detail.capacitador.linkedin_url} target="_blank" rel="noopener" className="instr-link">
                  Ver perfil de LinkedIn →
                </a>
              )}
            </div>
          )}
        </div>

        <aside className="card buybox">
          <div className="price">
            ${new Intl.NumberFormat("es-AR").format(detail.precio)} <small>{detail.moneda}</small>
          </div>
          <ul>
            <li>Material interactivo</li>
            <li>Examen de certificación final</li>
            <li>Certificado verificable con ID único</li>
            <li>Acceso ilimitado al contenido</li>
          </ul>
          {/* La inscripción real dispara checkout Mercado Pago (Fase 2). */}
          <EnrollButton courseId={detail.id} />
          <p className="fineprint">Pago protegido con Mercado Pago</p>
        </aside>
      </div>
    </div>
  );
}
