import Exam from "./Exam";

export const metadata = { title: "Examen" };

export default function ExamenPage({ params }: { params: { id: string } }) {
  return <Exam courseId={params.id} />;
}
