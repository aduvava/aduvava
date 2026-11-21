import Link from "next/link";
import { prisma } from "@/lib/db";
import { BcaEssayGrading, type EssayGradeItem } from "@/components/admin/bca-essay-grading";

export const dynamic = "force-dynamic";

export default async function BcaEssayGradePage() {
  // Parent admin layout checks entitlement. Fetch only submitted BCA answers.
  const attempts = await prisma.attempt.findMany({
    where: { status: "SUBMITTED", exam: { specialExamTrack: "DGNL_BCA" } },
    orderBy: { submittedAt: "desc" },
    take: 80,
    include: {
      user: { select: { name: true, email: true } },
      exam: { select: { title: true, questions: { where: { type: "ESSAY" }, select: { id: true, position: true, prompt: true, points: true } } } },
      answers: { where: { question: { type: "ESSAY" } }, select: { questionId: true, value: true, score: true } },
    },
  });
  const marks = attempts.length ? await prisma.aiFeedback.findMany({
    where: { type: "manual-essay-grade", userId: { in: [...new Set(attempts.map((attempt) => attempt.userId))] } },
    orderBy: { createdAt: "desc" },
    take: 2000,
  }) : [];
  const marked = new Set(marks.map((mark) => {
    const input = mark.input && typeof mark.input === "object" && !Array.isArray(mark.input) ? mark.input : null;
    return String(input?.attemptId ?? "") + ":" + String(input?.questionId ?? "");
  }));
  const items: EssayGradeItem[] = attempts.flatMap((attempt) => attempt.exam.questions.map((question) => {
    const answer = attempt.answers.find((item) => item.questionId === question.id);
    const graded = marked.has(attempt.id + ":" + question.id);
    return {
      attemptId: attempt.id,
      questionId: question.id,
      examTitle: attempt.exam.title,
      studentName: attempt.user.name || attempt.user.email || "Học viên",
      prompt: question.prompt,
      answer: typeof answer?.value === "string" ? answer.value : "",
      maxScore: question.points,
      score: graded ? answer?.score ?? 0 : null,
      isGraded: graded,
    };
  }));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin/exams" className="text-sm font-bold text-orange-600">Quay về Quản lý đề thi</Link>
      <h1 className="mt-4 text-2xl font-black text-slate-900 sm:text-3xl">Chấm tự luận ĐGNL Bộ Công an</h1>
      <p className="mt-3 mb-6 max-w-3xl text-sm leading-6 text-slate-600">
        Trắc nghiệm được chấm tự động trên 75 điểm; bài nghị luận xã hội tối đa 25 điểm do Admin chấm.
        Tổng điểm 100 chỉ được coi là hoàn tất khi bài tự luận đã được chấm.
        Các lần chấm/sửa điểm được lưu lịch sử.
      </p>
      <BcaEssayGrading initialItems={items} />
    </main>
  );
}
