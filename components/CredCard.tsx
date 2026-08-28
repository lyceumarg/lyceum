"use client";
import { useEffect, useRef } from "react";
import { scrambleText } from "@/lib/motion";

// Tarjeta de credencial con el motion de verificación (scramble del ID +
// check que se dibuja). Se usa en el hero de Sitio A (índigo, sistema de
// Lyceum) y en el hero de cada academia (color propio del tenant).
export default function CredCard({
  tag,
  title,
  who,
  finalId,
  tenant = false,
}: {
  tag: string;
  title: string;
  who: string;
  finalId: string;
  tenant?: boolean;
}) {
  const idRef = useRef<HTMLSpanElement>(null);
  const checkRef = useRef<SVGSVGElement>(null);
  const vsRef = useRef<HTMLSpanElement>(null);
  const color = tenant ? "var(--accent)" : "#2a2f77";

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    checkRef.current?.classList.remove("draw");
    vsRef.current?.classList.remove("on");
    scrambleText(
      idRef.current,
      finalId,
      () => {
        checkRef.current?.classList.add("draw");
        vsRef.current?.classList.add("on");
      },
      reduce
    );
  }, [finalId]);

  return (
    <div className="cred rv">
      <div className="top">
        <span className="tag">{tag}</span>
        <span className="seal" style={{ borderColor: color }}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.4" />
            <path d="M8 12.5l2.5 2.5L16 9" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <h3>{title}</h3>
      <div className="who">{who}</div>
      <div className="idrow">
        <span className="id" ref={idRef}>
          {finalId.replace(/[^·‧-]/g, "·")}
        </span>
        <span className="vstate" ref={vsRef} style={{ color }}>
          <svg className="check" ref={checkRef} viewBox="0 0 24 24">
            <path d="M5 12.5l4 4L19 7" stroke={color} />
          </svg>
          Verificado
        </span>
      </div>
    </div>
  );
}
