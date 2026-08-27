import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserContext, isStaff } from "@/lib/auth";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserContext();
  if (!user) redirect("/login");
  if (!isStaff(user.rol)) redirect("/");

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <div className="panel-sub">
        <Link href="/panel" className="on">Cursos</Link>
        <Link href="/panel/participantes">Participantes</Link>
        <Link href="/panel/ganancias">Ganancias</Link>
        <Link href="/panel/institucional">Institucional</Link>
      </div>
      {children}
    </div>
  );
}
