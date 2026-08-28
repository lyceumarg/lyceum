import { getTenantByHost, isPlatformHost } from "@/lib/tenant";
import { getCatalog } from "@/lib/queries";
import { type Course } from "@/components/CourseCard";
import CatalogFilter from "@/components/CatalogFilter";
import CredCard from "@/components/CredCard";
import SitioA from "@/components/SitioA";

export default async function Home() {
  const tenant = await getTenantByHost();

  // Host de plataforma: el Sitio A (landing comercial de Lyceum).
  if (!tenant) {
    if (isPlatformHost()) return <SitioA />;
    return (
      <section className="wrap" style={{ padding: "80px 32px" }}>
        <span className="eyebrow">Dominio sin academia</span>
        <h1 style={{ fontSize: 32, marginTop: 8 }}>Esta dirección no tiene una academia asignada.</h1>
        <p style={{ color: "var(--muted)", marginTop: 10 }}>
          Verificá el dominio de acceso de tu organización.
        </p>
      </section>
    );
  }

  const courses = (await getCatalog()) as Course[];
  const nombre = tenant.nombre_academia;
  const demoId = courses[0] ? `${nombre.replace(/\s+/g, "").slice(0, 3).toUpperCase()}·2026·····` : "····-····-····";

  return (
    <div className="wrap">
      <div className="hero">
        <div>
          <span className="eyebrow t">Formación con certificación verificable</span>
          <h1>
            Capacitate. <em>Certificate.</em> Comprobalo.
          </h1>
          <p>
            Cursos de {nombre} con material interactivo, examen final y certificado con ID verificable
            públicamente. Estudiá a tu ritmo, 100% online.
          </p>
          <div className="hero-cta">
            <a href="#catalogo" className="btn accent">Ver cursos</a>
            <a href="/mis-cursos" className="btn ghost">Mis cursos</a>
          </div>
          <div className="stats">
            <div><div className="n">{courses.length}</div><div className="l">Cursos disponibles</div></div>
            <div><div className="n">100%</div><div className="l">Certificados verificables</div></div>
          </div>
        </div>

        <CredCard
          tag={`Certificado · ${nombre}`}
          title={courses[0]?.titulo ?? "Certificación profesional"}
          who={courses[0]?.categoria ?? "Certificación verificable"}
          finalId={demoId}
          tenant
        />
      </div>

      <div className="sec" id="catalogo">
        <div className="sec-head">
          <div>
            <span className="eyebrow t">Catálogo</span>
            <h2>Elegí tu próxima certificación</h2>
          </div>
        </div>

        <CatalogFilter courses={courses} />

        <div className="vstrip rv">
          <div>
            <h3>¿Tenés una credencial? Comprobala.</h3>
            <p>Ingresá el identificador del certificado y validá al instante que fue emitido por {nombre}.</p>
          </div>
          <form action="/verificar" className="vform light">
            <input name="id" placeholder="Identificador del certificado" />
            <button type="submit">Verificar</button>
          </form>
        </div>
      </div>
    </div>
  );
}
