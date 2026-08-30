import LyceumMark from "@/components/LyceumMark";

// "Powered by Lyceum": presencia constante en TODA página de toda academia
// (incluidas certificado y verificación) — es la identidad del proveedor,
// visible siempre, sin opción de marca blanca.
export default function PoweredBy() {
  return (
    <a href="https://lyceum.com.ar" target="_blank" rel="noopener" className="powered-by">
      <LyceumMark size={14} />
      Powered by Lyceum
    </a>
  );
}
