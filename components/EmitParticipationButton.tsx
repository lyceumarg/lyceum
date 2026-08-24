"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EmitParticipationButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function emitir() {
    setBusy(true);
    const { error } = await createClient().rpc("emitir_participacion", { p_course: courseId });
    setBusy(false);
    if (error) { alert(error.message); return; }
    router.refresh();
  }

  return (
    <button
      className="btn accent"
      style={{ alignSelf: "start", padding: "8px 14px", fontSize: 13 }}
      onClick={emitir}
      disabled={busy}
    >
      {busy ? "Emitiendo…" : "Emitir constancia de participación"}
    </button>
  );
}
