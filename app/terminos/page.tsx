import Link from "next/link";
import LyceumMark from "@/components/LyceumMark";

export const metadata = { title: "Términos y Condiciones · Lyceum" };

export default function TerminosPage() {
  return (
    <div className="sitioa">
      <div className="wrap">
        <div style={{ padding: "22px 0", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 18 }}>
            <LyceumMark size={26} /> Lyceum
          </Link>
        </div>

        <div className="legal">
          <h1>Términos y Condiciones de Uso</h1>
          <p className="updated">ÚLTIMA ACTUALIZACIÓN: SEPTIEMBRE 2026</p>

          <p>
            Lyceum es una plataforma que permite a organizaciones ("academias") crear, administrar y dictar
            cursos con certificación propia, y emitir credenciales verificables públicamente. Estos Términos
            rigen el uso de la plataforma, tanto por parte de las academias como de las personas que cursan
            en ellas ("participantes").
          </p>
          <p>
            Al crear una cuenta o utilizar la plataforma de cualquier forma, aceptás estos Términos. Si no
            estás de acuerdo, no debés utilizar el servicio.
          </p>

          <h2>1. Qué es Lyceum</h2>
          <p>
            Lyceum provee la infraestructura técnica: el software para armar cursos, tomar exámenes, emitir
            certificados y verificarlos públicamente. Cada academia opera bajo su propia marca — Lyceum no
            participa en la relación pedagógica ni comercial entre la academia y sus participantes.
          </p>

          <h2>2. Contenido de las academias</h2>
          <p>
            Cada academia es la única responsable del contenido que carga: su exactitud, legalidad, y si
            corresponde a lo que promete enseñar. La propiedad intelectual del contenido de un curso le
            pertenece a la academia que lo creó, no a Lyceum.
          </p>

          <h2>3. Certificados y credenciales</h2>
          <p>
            Lyceum emite la credencial y provee un identificador público para verificarla, pero el valor,
            alcance y validez de lo que certifica cada credencial son definidos y garantizados por la
            academia emisora — no por Lyceum.
          </p>

          <h2>4. Cuentas de usuario</h2>
          <p>
            Sos responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra
            en tu cuenta. Avisanos si sospechás un uso no autorizado.
          </p>

          <h2>5. Pagos</h2>
          <p>
            Hoy, la inscripción a un curso se coordina entre la academia y el participante — Lyceum no
            procesa pagos directamente. Cuando esté disponible el pago online dentro de la plataforma, estos
            Términos se van a actualizar para reflejarlo.
          </p>

          <h2>6. Uso aceptable</h2>
          <p>No está permitido usar Lyceum para:</p>
          <ul>
            <li>Cargar contenido ilegal, engañoso o que infrinja derechos de terceros.</li>
            <li>Suplantar la identidad de otra persona u organización.</li>
            <li>Emitir certificados sobre capacitaciones que no se dictaron realmente.</li>
            <li>Intentar acceder sin autorización a cuentas o datos de otras academias.</li>
          </ul>

          <h2>7. Disponibilidad del servicio</h2>
          <p>
            Hacemos lo posible por mantener la plataforma disponible, pero no garantizamos un funcionamiento
            ininterrumpido o libre de errores.
          </p>

          <h2>8. Límite de responsabilidad</h2>
          <p>
            En la medida permitida por la ley, Lyceum no es responsable por daños indirectos derivados del
            uso de la plataforma, ni por el contenido, la veracidad o el valor de los cursos y certificados
            emitidos por las academias.
          </p>

          <h2>9. Cambios a estos Términos</h2>
          <p>
            Podemos actualizar estos Términos. Si el cambio es significativo, lo vamos a comunicar por la
            plataforma o por email antes de que entre en vigencia.
          </p>

          <h2>10. Ley aplicable</h2>
          <p>
            Estos Términos se rigen por las leyes de la República Argentina.
          </p>

          <h2>11. Contacto</h2>
          <p>
            Consultas sobre estos Términos: <a href="mailto:hola@lyceum.com.ar">hola@lyceum.com.ar</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
