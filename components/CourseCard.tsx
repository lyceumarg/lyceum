import Link from "next/link";

function code(cat: string | null, titulo: string) {
  const src = (cat?.split("·").pop() ?? titulo).trim();
  return src.replace(/[^A-Za-zÁÉÍÓÚÑ]/g, "").slice(0, 3).toUpperCase() || "CUR";
}

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
    <Link href={`/curso/${c.id}`} className="card course">
      <div className="thumb">
        <span className="code">{code(c.categoria, c.titulo)}</span>
      </div>
      <div className="body">
        {c.categoria && <span className="cat">{c.categoria}</span>}
        <h3>{c.titulo}</h3>
        <p className="desc">{c.descripcion}</p>
        {c.instr_nombre && (
          <div className="byline">
            {c.instr_foto_url
              ? <img src={c.instr_foto_url} alt="" />
              : <span className="ph">{c.instr_nombre.slice(0, 1).toUpperCase()}</span>}
            <span>Dictado por {c.instr_nombre}</span>
          </div>
        )}
        <div className="foot">
          <span className="price">
            ${new Intl.NumberFormat("es-AR").format(c.precio)}
          </span>
          <span className="eyebrow">{c.modulos} módulos</span>
        </div>
      </div>
    </Link>
  );
}
