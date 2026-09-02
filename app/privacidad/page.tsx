import Link from "next/link";
import LyceumMark from "@/components/LyceumMark";

export const metadata = { title: "Política de Privacidad · Lyceum" };

export default function PrivacidadPage() {
  return (
    <div className="sitioa">
      <div className="wrap">
        <div style={{ padding: "22px 0", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 18 }}>
            <LyceumMark size={26} /> Lyceum
          </Link>
        </div>

        <div className="legal">
          <h1>Política de Privacidad</h1>
          <p className="updated">ÚLTIMA ACTUALIZACIÓN: SEPTIEMBRE 2026</p>

          <p>
            Esta política explica qué datos personales trata Lyceum, con qué finalidad, y qué derechos
            tenés al respecto, en línea con la Ley 25.326 de Protección de Datos Personales de Argentina.
          </p>

          <h2>1. Dos roles distintos</h2>
          <p>
            Lyceum cumple dos roles distintos según de quién sean los datos:
          </p>
          <ul>
            <li>
              <strong>Datos de participantes de un curso</strong> (nombre, email, progreso, resultados de
              examen): la academia decide qué se ofrece y a quién. Lyceum actúa como encargado del
              tratamiento — procesa esos datos por cuenta y siguiendo las instrucciones de la academia.
            </li>
            <li>
              <strong>Datos de cuentas de staff de una academia, y de quienes visitan el sitio de
              Lyceum</strong>: acá Lyceum es responsable directo del tratamiento.
            </li>
          </ul>
          <p>
            Si sos participante de un curso y tenés dudas sobre tus datos, la academia que dicta ese curso
            es tu primer punto de contacto — Lyceum solo aloja la información por su cuenta.
          </p>

          <h2>2. Qué datos recolectamos</h2>
          <ul>
            <li>Nombre y email, al crear una cuenta.</li>
            <li>Progreso de cursada, resultados de examen y certificados obtenidos.</li>
            <li>Datos técnicos básicos de uso (por ejemplo, fecha de inscripción o de inicio de sesión).</li>
          </ul>
          <p>
            Lyceum no pide DNI ni datos financieros por defecto. Si una academia en particular los solicita
            como parte de su propio proceso, esa recolección es responsabilidad de la academia.
          </p>

          <h2>3. Para qué usamos los datos</h2>
          <ul>
            <li>Prestar el servicio: crear tu cuenta, mostrar tus cursos, emitir tus certificados.</li>
            <li>Comunicaciones necesarias para el uso de la plataforma (por ejemplo, recuperar tu contraseña).</li>
            <li>Permitir la verificación pública de una credencial, mostrando los datos mínimos necesarios
              (nombre, curso, fecha) a quien consulte ese identificador específico.</li>
          </ul>

          <h2>4. Con quién compartimos datos</h2>
          <p>
            Usamos proveedores externos para operar la plataforma: alojamiento de base de datos (Supabase,
            con infraestructura en San Pablo, Brasil) y envío de emails transaccionales (Resend). Estos
            proveedores procesan los datos únicamente para prestarnos ese servicio técnico. No vendemos
            datos personales a terceros.
          </p>

          <h2>5. Conservación</h2>
          <p>
            Conservamos los datos mientras la cuenta esté activa, y el tiempo adicional necesario para
            cumplir obligaciones legales o resolver disputas.
          </p>

          <h2>6. Tus derechos</h2>
          <p>
            Bajo la Ley 25.326, tenés derecho a acceder, rectificar, actualizar o solicitar la eliminación
            de tus datos personales. Para ejercerlos, escribinos a{" "}
            <a href="mailto:hola@lyceum.com.ar">hola@lyceum.com.ar</a>. La Agencia de Acceso a la
            Información Pública (AAIP), órgano de control de la Ley 25.326, es la autoridad ante la que
            podés reclamar si considerás que tus derechos no fueron respetados.
          </p>

          <h2>7. Seguridad</h2>
          <p>
            Aplicamos medidas técnicas razonables para proteger los datos (acceso restringido por cuenta y
            organización, conexiones cifradas). Ningún sistema es 100% infalible, pero trabajamos para
            minimizar riesgos.
          </p>

          <h2>8. Menores de edad</h2>
          <p>
            Lyceum no está dirigido a menores de edad. Si una academia carga participantes menores, es
            responsabilidad de esa academia contar con el consentimiento correspondiente de madres, padres
            o tutores.
          </p>

          <h2>9. Cambios a esta política</h2>
          <p>
            Si hacemos un cambio significativo, lo vamos a comunicar antes de que entre en vigencia.
          </p>

          <h2>10. Contacto</h2>
          <p>
            Consultas sobre esta política: <a href="mailto:hola@lyceum.com.ar">hola@lyceum.com.ar</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
