"use client";
import { useMemo, useState } from "react";
import CourseCard, { type Course } from "@/components/CourseCard";

export default function CatalogFilter({ courses }: { courses: Course[] }) {
  const categorias = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((c) => c.categoria && set.add(c.categoria));
    return Array.from(set);
  }, [courses]);

  const [activa, setActiva] = useState<string | null>(null);
  const filtrados = activa ? courses.filter((c) => c.categoria === activa) : courses;

  if (!courses.length) {
    return <div className="card empty">Todavía no hay cursos publicados en esta academia.</div>;
  }

  return (
    <>
      {categorias.length > 1 && (
        <div className="cats">
          <span className={`chip${activa === null ? " on" : ""}`} onClick={() => setActiva(null)}>
            Todos
          </span>
          {categorias.map((cat) => (
            <span key={cat} className={`chip${activa === cat ? " on" : ""}`} onClick={() => setActiva(cat)}>
              {cat}
            </span>
          ))}
        </div>
      )}
      <div className="grid">
        {filtrados.map((c) => (
          <CourseCard key={c.id} c={c} />
        ))}
      </div>
    </>
  );
}
