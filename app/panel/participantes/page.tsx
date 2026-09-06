import { createClient } from "@/lib/supabase/server";
import ParticipantesTable from "@/components/panel/ParticipantesTable";

export const metadata = { title: "Participantes" };

export default async function ParticipantesPage() {
  const supabase = createClient();

  // RPC: calcula avance % y certificado/puntaje en el servidor (evita una
  // consulta extra por cada participante desde el cliente). Los filtros y
  // la exportación se resuelven del lado del cliente, sobre estos mismos
  // datos — sin volver a pedirle nada a la base por cada cambio de filtro.
  const { data: rows } = await supabase.rpc("participantes_con_avance");

  return <ParticipantesTable filas={rows ?? []} />;
}
