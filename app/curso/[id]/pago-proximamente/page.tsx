import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pagar con Mercado Pago" };

export default async function PagoProximamentePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: curso } = await supabase.from("courses").select("titulo").eq("id", params.id).single();
  if (!curso) notFound();

  return (
    <div className="wrap" style={{ maxWidth: 560, textAlign: "center", padding: "70px 24px" }}>
      <span className="eyebrow" style={{ justifyContent: "center" }}>Pago con Mercado Pago</span>
      <h1 style={{ fontSize: 30, margin: "14px 0" }}>Muy pronto.</h1>
      <p style={{ color: "var(--muted)", fontSize: 15, marginBottom: 30 }}>
        Todavía estamos activando el pago online para <strong>{curso.titulo}</strong>. Mientras tanto, podés
        pedirle a la academia que te inscriba directamente.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link href={`/curso/${params.id}`} className="btn ghost">← Volver al curso</Link>
      </div>
    </div>
  );
}
