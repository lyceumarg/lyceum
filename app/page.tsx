import { getTenantByHost, isPlatformHost, currentHost } from "@/lib/tenant";
import { getCatalog } from "@/lib/queries";
import CourseCard, { type Course } from "@/components/CourseCard";

export default async function Home() {
  const tenant = await getTenantByHost();

  // Host de plataforma: acá viviría el Sitio A. En este repo (Sitio B) redirigimos
  // conceptualmente; mostramos un aviso neutro sin marca de tenant.
  if (!tenant) {
    return (
      <section className="wrap" style={{ padding: "80px 32px" }}>
        <span className="eyebrow">Dominio sin academia</span>
        <h1 style={{ fontSize: 32, marginTop: 8 }}>Esta dirección no tiene una academia asignada.</h1>
        <p style={{ color: "var(--muted)", marginTop: 10 }}>
          Verificá el dominio de acceso de tu organización.
          {isPlatformHost() && " (Este es el host de plataforma: el sitio del proveedor corre aparte.)"}
        </p>
      </section>
    );
  }

  const courses = (await getCatalog()) as Course[];
  const nombre = tenant.nombre_academia;

  return (
    <>
      <section className="hero wrap">
        <span className="eyebrow">Certificaciones con validez verificable</span>
        <h1>
          Capacitate y <em>certificate</em> en {nombre}.
        </h1>
        <p>
          Cursos con material interactivo, examen final y certificado verificable con ID único.
          Estudiá a tu ritmo, 100% online.
        </p>
        <div className="hero-cta">
          <a href="#catalogo" className="btn accent">Ver cursos</a>
          <a href="/mis-cursos" className="btn ghost">Mis cursos</a>
        </div>
        <div className="stats">
          <div><div className="n">{courses.length}</div><div className="l">Cursos disponibles</div></div>
          <div><div className="n">100%</div><div className="l">Certificados verificables</div></div>
        </div>
      </section>

      <section className="wrap" id="catalogo">
        <div className="sec-head">
          <div>
            <span className="eyebrow">Catálogo</span>
            <h2>Elegí tu próxima certificación</h2>
          </div>
        </div>
        {courses.length ? (
          <div className="grid">
            {courses.map((c) => <CourseCard key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="card empty">Todavía no hay cursos publicados en esta academia.</div>
        )}
      </section>
    </>
  );
}
