"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Opcion = { id: string; texto: string };
type Pregunta = { id: string; enunciado: string; tipo: string; opciones: Opcion[] };
type ExamData = { corte: number; intento: number; max_intentos: number | null; preguntas: Pregunta[] };
type Resultado = { puntaje: number; aprobado: boolean; certificado: string | null };

export default function Exam({ courseId }: { courseId: string }) {
  const supabase = createClient();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [gate, setGate] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [res, setRes] = useState<Resultado | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_exam", { p_course: courseId });
      if (error) {
        const m = error.message.includes("avance") ? "Completá el 100% del curso para rendir."
          : error.message.includes("intentos") ? "No te quedan intentos disponibles."
          : error.message.includes("inscripción") ? "No estás inscripto en este curso."
          : "No pudimos cargar el examen.";
        setGate(m);
        return;
      }
      setExam(data as ExamData);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function enviar() {
    if (!exam) return;
    if (Object.keys(answers).length < exam.preguntas.length) return;
    setSending(true);
    const { data, error } = await supabase.rpc("submit_exam", { p_course: courseId, p_answers: answers });
    setSending(false);
    if (error) { setGate("No pudimos corregir el examen. Intentá de nuevo."); return; }
    setRes(data as Resultado);
  }

  if (gate) {
    return (
      <div className="wrap" style={{ maxWidth: 620 }}>
        <div className="card empty" style={{ marginTop: 40 }}>
          {gate}
          <div style={{ marginTop: 14 }}>
            <Link href={`/curso/${courseId}/cursar`} className="btn ghost">Volver a la cursada</Link>
          </div>
        </div>
      </div>
    );
  }

  if (res) {
    const color = res.aprobado ? "var(--valid)" : "var(--danger)";
    return (
      <div className="wrap" style={{ maxWidth: 560 }}>
        <div className="card" style={{ textAlign: "center", padding: "50px 24px", marginTop: 30 }}>
          <div style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 56, color }}>{res.puntaje}%</div>
          <h2 style={{ fontSize: 28, margin: "8px 0", color }}>
            {res.aprobado ? "¡Aprobaste!" : "No alcanzaste el corte"}
          </h2>
          <p className="eyebrow">nota de corte {exam?.corte ?? 70}%</p>
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {res.aprobado && res.certificado ? (
              <Link href={`/certificado/${res.certificado}`} className="btn accent">Ver mi certificado</Link>
            ) : (
              <Link href={`/curso/${courseId}/cursar`} className="btn">Repasar el material</Link>
            )}
            <Link href="/mis-cursos" className="btn ghost">Mis cursos</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return <div className="wrap"><p style={{ color: "var(--muted)", marginTop: 40 }}>Cargando examen…</p></div>;
  }

  const faltan = exam.preguntas.length - Object.keys(answers).length;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <Link href={`/curso/${courseId}/cursar`} className="back">← Volver a la cursada</Link>
      <div className="exam-head">
        <div>
          <h2 style={{ color: "#fff", fontSize: 22 }}>Examen de certificación</h2>
          <div style={{ fontSize: 12.5, color: "#a9c0b5", marginTop: 6 }}>
            Nota de corte {exam.corte}% · {exam.preguntas.length} preguntas
            {exam.max_intentos ? ` · intento ${exam.intento} de ${exam.max_intentos}` : ""}
          </div>
        </div>
      </div>

      {exam.preguntas.map((q, i) => (
        <div className="q" key={q.id}>
          <span className="qn">PREGUNTA {i + 1}</span>
          <h4>{q.enunciado}</h4>
          {q.opciones.map((o) => (
            <div
              key={o.id}
              className={`opt${answers[q.id] === o.id ? " sel" : ""}`}
              onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
            >
              <span className="mk" />
              {o.texto}
            </div>
          ))}
        </div>
      ))}

      <button className="btn accent block" style={{ marginTop: 20 }} onClick={enviar} disabled={sending || faltan > 0}>
        {sending ? "Corrigiendo…" : faltan > 0 ? `Faltan ${faltan} respuestas` : "Enviar examen y corregir"}
      </button>
      <p className="foot">La aprobación se valida en el servidor: el cliente nunca decide la nota.</p>
    </div>
  );
}
