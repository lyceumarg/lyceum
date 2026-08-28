import Link from "next/link";

export type Course = {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  moneda: string;
  categoria: string | null;
  modulos: number;
  instr_nombre?: string | null;
  instr_foto_url?: string | null;
};

export default function CourseCard({ c }: { c: Course }) {
  return (
    <Link href={`/curso/${c.id}`} className="course">
      <div className="band">{c.categoria && <span className="k">{c.categoria}</span>}</div>
      <div className="body">
        <h4>{c.titulo}</h4>
        <span className="badge">✓ Certifica</span>
        {c.instr_nombre && (
          <div className="instr">
            {c.instr_foto_url ? (
              <img src={c.instr_foto_url} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span className="ph">{c.instr_nombre.slice(0, 1).toUpperCase()}</span>
            )}
            Dictado por {c.instr_nombre}
          </div>
        )}
        <div className="foot">
          <span>{c.modulos} módulos</span>
          <span className="price">${new Intl.NumberFormat("es-AR").format(c.precio)}</span>
        </div>
      </div>
    </Link>
  );
}
