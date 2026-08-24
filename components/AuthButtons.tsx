"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthButtons({ authed }: { authed: boolean }) {
  const router = useRouter();
  if (!authed) {
    return (
      <Link href="/login" className="cta">
        Ingresar
      </Link>
    );
  }
  async function salir() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button className="cta" onClick={salir} style={{ font: "inherit" }}>
      Salir
    </button>
  );
}
