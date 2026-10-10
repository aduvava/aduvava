import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function SharedExamPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const exam = await prisma.exam.findUnique({
    where: { shareToken: token },
    select: { id: true },
  });

  if (!exam) notFound();
  redirect(`/exams/${exam.id}`);
}
