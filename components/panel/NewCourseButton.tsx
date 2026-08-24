"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewCourseButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function crear() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const tenantId = (user?.app_metadata as { tenant_id?: string })?.tenant_id;
    const { data, error } = await supabase
      .from("courses")
      .insert({
        tenant_id: tenantId,
        titulo: "Curso sin título",
        estado: "borrador",
        instructor_id: user?.id,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) {
      alert("No pudimos crear el curso.");
      return;
    }
    router.push(`/panel/cursos/${data.id}`);
  }

  return (
    <button className="btn" onClick={crear} disabled={loading}>
      {loading ? "Creando…" : "+ Nuevo curso"}
    </button>
  );
}
