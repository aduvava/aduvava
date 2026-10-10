import { redirect } from "next/navigation";
import { ExamCreator } from "@/components/exam-creator";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function CreateExamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/exams/create");

  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, family: true },
  });

  return <ExamCreator subjects={subjects} role={user.role} />;
}
