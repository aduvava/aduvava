import { prisma } from "@/lib/db";
import { getPublicSubjects } from "@/lib/public-data";
import { ExamCard } from "@/components/exam-card";
import { SubjectCard } from "@/components/subject-card";
import { SectionHeader } from "@/components/ui";

async function getExams() {
  try {
    return await prisma.exam.findMany({ where: { family: "THPTQG", isPublished: true }, include: { subject: true, _count: { select: { questions: true, attempts: true } } }, orderBy: { createdAt: "desc" }, take: 9 });
  } catch {
    return [];
  }
}

export default async function ThptqgPage() {
  const [subjects, exams] = await Promise.all([getPublicSubjects("THPTQG"), getExams()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <SectionHeader eyebrow="THPTQG" title="Kho đề thi tốt nghiệp THPT" description="Mỗi môn có catalog riêng, đề FREE/PRO và kết quả được ghi vào dashboard học tập." />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {subjects.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
      </div>
      <h2 className="mt-16 font-display text-4xl font-black text-ink">Đề mới</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {exams.map((exam) => <ExamCard key={exam.id} exam={exam} />)}
      </div>
    </div>
  );
}
