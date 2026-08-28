"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Motion compartido de las superficies públicas (Sitio A + academia):
// scroll-reveal (.rv) y botones magnéticos (.btn). Se desactiva por completo
// dentro de /panel — el back-office es una herramienta de uso diario y va
// sin motion, por decisión de producto.
export default function MotionFX() {
  const pathname = usePathname() || "";
  const disabled = pathname.startsWith("/panel");

  useEffect(() => {
    if (disabled) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".rv").forEach((el) => io.observe(el));

    const cleanups: (() => void)[] = [];
    if (!reduce) {
      document.querySelectorAll<HTMLElement>(".btn").forEach((btn) => {
        const onMove = (e: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.12}px, ${
            (e.clientY - r.top - r.height / 2) * 0.18 - 2
          }px)`;
        };
        const onLeave = () => {
          btn.style.transform = "";
        };
        btn.addEventListener("pointermove", onMove);
        btn.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          btn.removeEventListener("pointermove", onMove);
          btn.removeEventListener("pointerleave", onLeave);
        });
      });
    }

    return () => {
      io.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, [pathname, disabled]);

  return null;
}
