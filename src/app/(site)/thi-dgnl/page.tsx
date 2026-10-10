import { prisma } from "@/lib/db";
import { getPublicSubjects } from "@/lib/public-data";
import { ExamCard } from "@/components/exam-card";
import { SubjectCard } from "@/components/subject-card";
import { SectionHeader } from "@/components/ui";

async function getExams() {
  try {
    return await prisma.exam.findMany({ where: { family: "DGNL", isPublished: true }, include: { subject: true, _count: { select: { questions: true, attempts: true } } }, orderBy: { createdAt: "desc" }, take: 9 });
  } catch {
    return [];
  }
}

export default async function DgnlPage() {
  const [subjects, exams] = await Promise.all([getPublicSubjects("DGNL"), getExams()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <SectionHeader eyebrow="ĐGNL" title="Kho đề đánh giá năng lực" description="Mô phỏng các phần tư duy, ngôn ngữ và định lượng; dùng chung engine attempt và scoring." />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
      </div>
      <h2 className="mt-16 font-display text-4xl font-black text-ink">Bài test nổi bật</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {exams.map((exam) => <ExamCard key={exam.id} exam={exam} />)}
      </div>
    </div>
  );
}
