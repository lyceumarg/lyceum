import LyceumMark from "@/components/LyceumMark";
import CredCard from "@/components/CredCard";
import type { CSSProperties } from "react";

// Sitio A — landing comercial de Lyceum. Se sirve cuando el host de la
// request es el host de plataforma (PLATFORM_HOST), sin ningún tenant
// resuelto. No lleva marca de ninguna academia: es 100% de Lyceum.
export default function SitioA() {
  return (
    <div className="sitioa">
      <div className="wrap">
        <nav className="nav" style={{ padding: "22px 0", borderBottom: "1px solid var(--line)", marginBottom: 6 }}>
          <Link_ />
          <div style={{ display: "flex", alignItems: "center", gap: 26, marginLeft: "auto" }}>
            <a href="#como-funciona">Cómo funciona</a>
            <a href="/login">Ingresar</a>
            <a href="mailto:hola@lyceum.com" className="btn sm" style={ctaStyle}>
              Pedir demo
            </a>
          </div>
        </nav>

        <div className="hero">
          <div>
            <span className="eyebrow">Plataforma de academias</span>
            <h1>
              Certificados que <em style={{ color: "var(--indigo)" }}>cualquiera</em> puede verificar.
            </h1>
            <p style={{ fontSize: 17, color: "#3a3d4d", maxWidth: "36ch", margin: "20px 0 28px" }}>
              Lanzá tu academia con marca propia y emití credenciales con validación pública. Vos ponés el
              contenido; la confianza viene incluida.
            </p>
            <div className="hero-cta">
              <a href="mailto:hola@lyceum.com" className="btn" style={{ background: "var(--indigo)" }}>
                Crear mi academia →
              </a>
              <a href="#como-funciona" className="btn ghost">
                Cómo funciona
              </a>
            </div>
          </div>

          <div>
            <CredCard
              tag="Credencial · Lyceum"
              title="Prevención de LA/FT"
              who="Emitido a nombre de un participante · Academia demo"
              finalId="LYC·2026·7Q4A"
            />
            <div className="marq">
              <div className="track">
                <span>
                  LYC·2026·7Q4A <b>✓</b>&nbsp;&nbsp; KYC·2026·M31X <b>✓</b>&nbsp;&nbsp; BCRA·2026·A08D <b>✓</b>
                  &nbsp;&nbsp; DDC·2026·9F2K <b>✓</b>&nbsp;&nbsp;
                </span>
                <span>
                  LYC·2026·7Q4A <b>✓</b>&nbsp;&nbsp; KYC·2026·M31X <b>✓</b>&nbsp;&nbsp; BCRA·2026·A08D <b>✓</b>
                  &nbsp;&nbsp; DDC·2026·9F2K <b>✓</b>&nbsp;&nbsp;
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="sec" id="como-funciona">
          <div className="sec-h rv">Cómo funciona</div>
          <div className="steps">
            <div className="step rv">
              <div className="n">A</div>
              <h4>Tu marca, tu dominio</h4>
              <p>Configurás el nombre, el logo y el color. Cada academia vive en su propio dominio, sin rastro de la plataforma.</p>
            </div>
            <div className="step rv">
              <div className="n">B</div>
              <h4>Cursás y evaluás</h4>
              <p>Armás módulos, lecciones y examen. La corrección y la nota se resuelven del lado del servidor.</p>
            </div>
            <div className="step rv">
              <div className="n">C</div>
              <h4>Emitís y se verifica</h4>
              <p>Al aprobar, se emite la credencial. Cualquiera la comprueba online por su identificador.</p>
            </div>
          </div>
        </div>

        <footer style={{ padding: "34px 0 60px", borderTop: "1px solid var(--line)", marginTop: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 11.5, letterSpacing: ".04em", color: "var(--muted)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span>LYCEUM · PLATAFORMA DE ACADEMIAS CON CERTIFICACIÓN</span>
          <span>© {new Date().getFullYear()} Lyceum</span>
        </footer>
      </div>
    </div>
  );
}

const ctaStyle: CSSProperties = {
  background: "var(--indigo)",
  color: "#fff",
  padding: "11px 20px",
  fontWeight: 600,
  fontSize: 14,
  borderRadius: 11,
};

function Link_() {
  return (
    <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: "-.02em" }}>
      <LyceumMark size={30} />
      Lyceum
    </a>
  );
}
