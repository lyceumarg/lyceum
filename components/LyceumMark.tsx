// Isotipo de Lyceum: sello circular + check (dirección "Verificable").
// Mismo motivo que el ícono de verificación en la tarjeta de credencial:
// el logo es la animación de verificación del producto, congelada.
export default function LyceumMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} aria-hidden="true">
      <circle cx="70" cy="70" r="58" fill="none" stroke="#2a2f77" strokeWidth="10" />
      <path
        d="M46 71 l16 16 32 -38"
        fill="none"
        stroke="currentColor"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
