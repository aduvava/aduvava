import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lightbulb,
  SearchCheck,
  ShieldCheck,
  Target,
  TimerReset,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessExam } from "@/lib/access";
import { AttemptStartButton } from "@/components/attempt-start-button";
import { ExamAccessGate } from "@/components/exam-access-gate";
import { getNationalExamRule, getNationalQuestionCount } from "@/lib/national-exam-rules";

export default async function ExamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ classTitle?: string }>;
}) {
  const { id } = await params;
  const titleFromClass = (await searchParams)?.classTitle?.trim();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/exams/${id}`);

  const exam = await prisma.exam.findFirst({
    where: { OR: [{ id }, { slug: id }, { code: id }], isPublished: true },
    include: {
      subject: true,
      _count: { select: { questions: true, attempts: true } },
    },
  });
  if (!exam) notFound();

  const allowed = await canAccessExam(user.id, exam);
  const lockedBySharing = Boolean(exam.ownerId && exam.ownerId !== user.id && exam.shareMode !== "PUBLIC");
  const nationalRule = exam.educationLevel === "THPTQG" ? getNationalExamRule(exam.subject.slug) : undefined;
  const questionCount = nationalRule ? getNationalQuestionCount(nationalRule) : exam._count.questions;
  const displayedParts = nationalRule?.parts.filter((part) => part.count > 0) ?? [];
  const displayTitle = titleFromClass && titleFromClass.length <= 120 ? titleFromClass : exam.title;

  return (
    <div className="exam-intro-page min-h-[calc(100vh-76px)] bg-[#fffdf6] pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href={`/subjects/${exam.subject.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-orange-500">
          <ArrowLeft className="h-5 w-5" /> Quay lại môn học
        </Link>

        <section className="mt-6 rounded-[2.5rem] border border-orange-100 bg-white px-5 py-8 text-center shadow-sm sm:px-10 sm:py-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
            {exam.educationLevel === "THPTQG" ? "Đề thi theo cấu trúc THPTQG" : "Đề luyện tập"}
          </p>
          <h1 className="mx-auto mt-3 max-w-4xl text-3xl font-black leading-tight text-slate-950 sm:text-5xl">{displayTitle}</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-500 sm:text-base">{exam.description}</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-5 py-3 font-black text-orange-600">
              <Clock3 className="h-5 w-5" /> {exam.durationMinutes} phút
            </span>
            <span className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-5 py-3 font-black text-blue-600">
              <BookOpen className="h-5 w-5" /> {questionCount} câu hỏi
            </span>
          </div>

          <div className="mt-9 rounded-[2rem] bg-slate-50 p-5 text-left sm:p-8">
            <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 sm:text-2xl">
              <AlertCircle className="h-7 w-7 text-orange-500" /> Nội quy & Cấu trúc đề thi
            </h2>

            {displayedParts.length ? (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-black text-slate-800">Cấu trúc đề ({displayedParts.length} phần):</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600 sm:text-base">
                  {displayedParts.map((part) => (
                    <li key={part.key}>
                      <strong>{part.label} ({part.count} câu):</strong>{" "}
                      {part.questionType === "SINGLE_CHOICE"
                        ? `Trắc nghiệm nhiều lựa chọn (${part.pointsPerQuestion.toFixed(2)}đ/câu)`
                        : part.questionType === "TRUE_FALSE_SET"
                          ? "Trắc nghiệm Đúng/Sai, mỗi câu gồm 4 ý"
                          : part.questionType === "SHORT_ANSWER"
                            ? "Trắc nghiệm trả lời ngắn"
                            : "Tự luận"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
                Thời gian và số lượng câu hỏi của đề này do người tạo đề quy định.
              </div>
            )}
          </div>

          <div className="mt-7 grid gap-6 text-left lg:grid-cols-2">
            <section className="rounded-[2rem] border border-orange-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-3 text-xl font-black text-slate-900">
                <ShieldCheck className="h-6 w-6 text-orange-500" /> Lưu ý khi làm bài
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
                {[
                  "Hệ thống sẽ tự động nộp bài khi hết thời gian.",
                  "Hệ thống sẽ tự động lưu bài làm của bạn liên tục.",
                  "Không chuyển tab hoặc thoát toàn màn hình trong quá trình làm bài. Hệ thống có thể ghi nhận vi phạm.",
                  "Kết quả và lời giải chi tiết sẽ hiển thị ngay sau khi nộp bài.",
                ].map((note) => (
                  <p key={note} className="flex items-start gap-3 rounded-2xl bg-orange-50/70 px-4 py-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-500" />
                    <span>{note}</span>
                  </p>
                ))}
              </div>
            </section>

            <section className="rounded-[2rem] border border-blue-100 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-3 text-xl font-black text-slate-900">
                <Lightbulb className="h-6 w-6 text-amber-500" /> Mẹo để đạt điểm cao
              </h2>
              <div className="mt-5 grid gap-4">
                {[
                  {
                    title: "Đọc kỹ từ khóa phủ định",
                    text: 'Hãy đặc biệt chú ý đến các từ khóa như "KHÔNG", "NGOẠI TRỪ" hoặc "SAI" để tránh mắc bẫy đáng tiếc.',
                    Icon: SearchCheck,
                    tone: "bg-amber-50 text-amber-600",
                  },
                  {
                    title: "Loại trừ đáp án sai rõ ràng",
                    text: "Nếu chưa chắc chắn 100% đâu là đáp án đúng, hãy loại bỏ ngay những phương án sai rõ ràng để tăng tỷ lệ chọn trúng.",
                    Icon: Target,
                    tone: "bg-blue-50 text-blue-600",
                  },
                  {
                    title: "Dành thời gian rà soát",
                    text: "Đừng vội nộp bài khi vừa làm xong. Hãy dành 7 - 10 phút cuối giờ để kiểm tra lại toàn bộ bài, nhất là câu khó đã đánh dấu.",
                    Icon: TimerReset,
                    tone: "bg-emerald-50 text-emerald-600",
                  },
                ].map(({ title, text, Icon, tone }) => (
                  <div key={title} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-900">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-9 flex justify-center">
            {allowed ? (
              <AttemptStartButton examId={exam.id} />
            ) : lockedBySharing ? (
              <div className="w-full">
                <ExamAccessGate examId={exam.id} mode={exam.shareMode} />
              </div>
            ) : (
              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 text-left">
                <p className="font-black text-slate-800">Đề này thuộc gói PRO.</p>
                <Link href="/vip" className="mt-4 inline-flex rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white">
                  Nạp vip
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
