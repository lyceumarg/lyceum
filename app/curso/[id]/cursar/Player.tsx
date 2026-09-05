"use client";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import BlockView, { type Block } from "@/components/BlockView";
import { marcarCompletada } from "../actions";

export type Leccion = { id: string; titulo: string; blocks: Block[] };
export type Modulo = { id: string; titulo: string; lessons: Leccion[] };

export default function Player({
  courseId,
  enrollmentId,
  titulo,
  categoria,
  modulos,
  completadasIniciales,
  esPrueba = false,
}: {
  courseId: string;
  enrollmentId: string;
  titulo: string;
  categoria: string | null;
  modulos: Modulo[];
  completadasIniciales: string[];
  esPrueba?: boolean;
}) {
  const flat = useMemo(
    () => modulos.flatMap((m) => m.lessons.map((l) => ({ ...l, modulo: m.titulo }))),
    [modulos]
  );
  const [done, setDone] = useState<Set<string>>(new Set(completadasIniciales));
  const [activa, setActiva] = useState<string>(flat[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const total = flat.length;
  const pct = total ? Math.round((done.size / total) * 100) : 0;
  const lista100 = pct === 100;
  const lec = flat.find((l) => l.id === activa);

  function completar() {
    if (!lec) return;
    setDone((prev) => new Set(prev).add(lec.id)); // optimista
    startTransition(() => marcarCompletada(courseId, enrollmentId, lec.id));
  }

  return (
    <div className="wrap">
      {esPrueba && (
        <div className="msg" style={{ background: "#eef0fb", borderColor: "#c7cbef", color: "#2a2f77", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <span>🧪 Estás viendo este curso en modo prueba — no cuenta como una inscripción real.</span>
          <Link href={`/panel/cursos/${courseId}`} className="btn ghost sm">← Volver al editor</Link>
        </div>
      )}
      <Link href="/mis-cursos" className="back">← Volver a mis cursos</Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
        <div>
          {categoria && <span className="eyebrow">{categoria}</span>}
          <h2 style={{ fontSize: 24 }}>{titulo}</h2>
          <a href={`/curso/${courseId}/material`} target="_blank" rel="noopener" style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 600, display: "inline-block", marginTop: 6 }}>
            ↓ Descargar material completo (PDF)
          </a>
        </div>
        <div style={{ textAlign: "right", minWidth: 180 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--muted)" }}>
            <span>Avance</span><span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>{pct}%</span>
          </div>
          <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="player">
        <aside className="pl-side">
          <h4>Contenido</h4>
          {modulos.map((m) => (
            <div key={m.id} className="pl-mod">
              <div className="pl-mod-title">{m.titulo}</div>
              {m.lessons.map((l) => (
                <div
                  key={l.id}
                  className={`les${l.id === activa ? " active" : ""}${done.has(l.id) ? " done" : ""}`}
                  onClick={() => setActiva(l.id)}
                >
                  <span className="dot">{done.has(l.id) ? "✓" : ""}</span>
                  <span>{l.titulo}</span>
                </div>
              ))}
            </div>
          ))}
        </aside>

        <section className="pl-main">
          {lec ? (
            <>
              <span className="eyebrow">{(lec as any).modulo}</span>
              <h3 style={{ fontSize: 22, margin: "6px 0 4px" }}>{lec.titulo}</h3>
              {lec.blocks.length ? (
                lec.blocks.map((b) => <BlockView key={b.id} b={b} />)
              ) : (
                <p style={{ color: "var(--muted)", marginTop: 16 }}>Esta lección todavía no tiene contenido.</p>
              )}

              <div className="pl-actions">
                <button className="btn" onClick={completar} disabled={pending || done.has(lec.id)}>
                  {done.has(lec.id) ? "✓ Completada" : "Marcar como completada"}
                </button>
                <Link
                  href={lista100 ? `/curso/${courseId}/examen` : "#"}
                  className="btn accent"
                  aria-disabled={!lista100}
                  style={!lista100 ? { pointerEvents: "none", opacity: 0.45 } : undefined}
                >
                  Rendir examen
                </Link>
                {!lista100 && (
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    Completá el 100% para habilitar el examen.
                  </span>
                )}
              </div>
            </>
          ) : (
            <p style={{ color: "var(--muted)" }}>Este curso todavía no tiene lecciones.</p>
          )}
        </section>
      </div>
    </div>
  );
}
