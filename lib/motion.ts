// Utilidad de "scramble": el texto final se revela letra por letra desde
// caracteres aleatorios, como en la credencial/verificación. Respeta
// prefers-reduced-motion.
const CH = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";

export function scrambleText(
  el: HTMLElement | null,
  final: string,
  done?: () => void,
  reduce = false
) {
  if (!el) return;
  if (reduce) {
    el.textContent = final;
    done?.();
    return;
  }
  let i = 0;
  const steps = 18;
  const t = setInterval(() => {
    el.textContent = final
      .split("")
      .map((c, k) =>
        c === "·" || c === "‧" ? c : k < (i / steps) * final.length ? c : CH[Math.floor(Math.random() * CH.length)]
      )
      .join("");
    if (i++ >= steps) {
      clearInterval(t);
      el.textContent = final;
      done?.();
    }
  }, 34);
}
