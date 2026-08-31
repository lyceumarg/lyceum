"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { solicitarInscripcion } from "./actions";

export default function EnrollChoice({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function contactar() {
    setError(null);
    startTransition(async () => {
      const res = await solicitarInscripcion(courseId);
      if (res.ok) setEnviado(true);
      else setError(res.error ?? "No se pudo enviar la solicitud");
    });
  }

  if (enviado) {
    return (
      <div className="msg ok" style={{ marginBottom: 0 }}>
        Listo — le avisamos a la academia. Te van a contactar para coordinar la inscripción.
      </div>
    );
  }

  return (
    <div>
      <Link href={`/curso/${courseId}/pago-proximamente`} className="btn accent block" style={{ marginBottom: 10 }}>
        Pagar con Mercado Pago
      </Link>
      <button className="btn ghost block" onClick={contactar} disabled={pending}>
        {pending ? "Enviando…" : "Contactar a la academia para inscribirme"}
      </button>
      {error && <div className="msg err" style={{ marginTop: 10, marginBottom: 0 }}>{error}</div>}
    </div>
  );
}
