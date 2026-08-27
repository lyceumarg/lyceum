import LyceumMark from "@/components/LyceumMark";

// Sitio A — landing comercial de Lyceum. Se sirve cuando el host de la
// request es el host de plataforma (PLATFORM_HOST), sin ningún tenant
// resuelto. No lleva marca de ninguna academia: es 100% de Lyceum.
export default function SitioA() {
  return (
    <div className="sitioa">
      <nav className="sitioa-nav">
        <div className="sitioa-logo">
          <LyceumMark size={30} />
          Lyceum
        </div>
        <a href="mailto:hola@lyceum.com" className="cta">Pedir demo</a>
      </nav>

      <section className="sitioa-hero">
        <span className="sitioa-eyebrow">Plataforma de academias</span>
        <h1>Certificados que <em>cualquiera</em> puede verificar.</h1>
        <p>
          Lanzá tu academia con marca propia y emití credenciales con validación pública.
          Vos ponés el contenido; la confianza viene incluida.
        </p>
        <div className="sitioa-cta">
          <a href="mailto:hola@lyceum.com" className="sitioa-btn primary">Quiero mi academia →</a>
          <a href="#como-funciona" className="sitioa-btn ghost">Cómo funciona</a>
        </div>
      </section>

      <section className="sitioa-steps" id="como-funciona">
        <h2>Cómo funciona</h2>
        <div className="sitioa-steps-grid">
          <div className="sitioa-step">
            <div className="n">A</div>
            <h3>Tu marca, tu dominio</h3>
            <p>Configurás nombre, logo y color. Cada academia vive en su propio dominio, sin rastro de la plataforma.</p>
          </div>
          <div className="sitioa-step">
            <div className="n">B</div>
            <h3>Cursás y evaluás</h3>
            <p>Armás módulos, lecciones y examen. La corrección y la nota se resuelven del lado del servidor.</p>
          </div>
          <div className="sitioa-step">
            <div className="n">C</div>
            <h3>Emitís y se verifica</h3>
            <p>Al aprobar, se emite la credencial. Cualquiera la comprueba online por su identificador.</p>
          </div>
        </div>
      </section>

      <footer className="sitioa-footer">
        <span>LYCEUM · PLATAFORMA DE ACADEMIAS CON CERTIFICACIÓN</span>
        <span>© {new Date().getFullYear()} Lyceum</span>
      </footer>
    </div>
  );
}
