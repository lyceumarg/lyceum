import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseDetail } from "@/lib/queries";
import EnrollButton from "./EnrollButton";

type Detail = {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  categoria: string | null;
  corte: number;
  modulos: { titulo: string; lecciones: string[] | null }[];
};

export default async function CursoPage({ params }: { params: { id: string } }) {
  const detail = (await getCourseDetail(params.id)) as Detail | null;
  if (!detail) notFound();

  return (
    <div className="wrap">
      <Link href="/" className="back">← Volver al catálogo</Link>
      <div className="detail-grid">
        <div>
          {detail.categoria && <span className="eyebrow">{detail.categoria}</span>}
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 14px" }}>{detail.titulo}</h1>
          <p style={{ color: "var(--muted)", fontSize: 15.5, maxWidth: "60ch" }}>{detail.descripcion}</p>
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <span className="pill">{detail.modulos.length} módulos</span>
            <span className="pill">Examen certificante · corte {detail.corte}%</span>
          </div>

          <h3 style={{ fontSize: 19, margin: "26px 0 14px" }}>Contenido del programa</h3>
          {detail.modulos.map((m, i) => (
            <div className="mod" key={i}>
              <span className="idx">M{String(i + 1).padStart(2, "0")}</span>
              <span>{m.titulo}</span>
              <span className="cnt">{m.lecciones?.length ?? 0} lecciones</span>
            </div>
          ))}
        </div>

        <aside className="card buybox">
          <div className="price">
            ${new Intl.NumberFormat("es-AR").format(detail.precio)} <small>{detail.moneda}</small>
          </div>
          <ul style={{ listStyle: "none", margin: "18px 0", fontSize: 13.5, color: "var(--ink)" }}>
            <li style={{ padding: "5px 0" }}>Material interactivo</li>
            <li style={{ padding: "5px 0" }}>Examen de certificación final</li>
            <li style={{ padding: "5px 0" }}>Certificado verificable con ID único</li>
          </ul>
          {/* La inscripción real dispara checkout Mercado Pago (Fase 2). */}
          <EnrollButton courseId={detail.id} />
          <p className="eyebrow" style={{ textAlign: "center", marginTop: 12 }}>
            Pago protegido con Mercado Pago
          </p>
        </aside>
      </div>
    </div>
  );
}
