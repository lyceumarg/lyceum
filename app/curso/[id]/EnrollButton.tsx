"use client";
import { useTransition } from "react";
import { inscribirme } from "./actions";

export default function EnrollButton({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn accent block"
      disabled={pending}
      onClick={() => startTransition(() => inscribirme(courseId))}
    >
      {pending ? "Inscribiendo…" : "Inscribirme"}
    </button>
  );
}
