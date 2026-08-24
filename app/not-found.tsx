import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: "80px 32px" }}>
      <span className="eyebrow">404</span>
      <h1 style={{ fontSize: 32, marginTop: 8 }}>No encontramos esa página.</h1>
      <p style={{ color: "var(--muted)", margin: "10px 0 20px" }}>
        Puede que el curso o la dirección ya no existan.
      </p>
      <Link href="/" className="btn ghost">Volver al catálogo</Link>
    </div>
  );
}
