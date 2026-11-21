import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, BarChart3, BookOpenCheck, CheckCircle2, ClipboardList,
  Layers3, Lightbulb, Target, TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildLearningMap, scopeOfAttempt, type LearningGroup } from "@/lib/learning-insights";

export const dynamic = "force-dynamic";

function ProgressRow({ item, detail }: { item: LearningGroup; detail: string }) {
  const barColor = !item.enough
    ? "bg-slate-400"
    : item.percent < 50 ? "bg-rose-500" : item.percent < 75 ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-sm font-extrabold text-slate-800 sm:text-base">{item.label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="shrink-0 text-lg font-black tabular-nums text-orange-600">{item.percent}%</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar"
        aria-label={"Tỷ lệ điểm " + item.label} aria-valuenow={item.percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={"h-full rounded-full transition-all " + barColor} style={{ width: item.percent + "%" }} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={"text-[11px] font-semibold " + (item.enough ? "text-slate-500" : "text-amber-700")}>
          {item.enough ? "Từ kết quả đã làm" : "Ít dữ liệu, chưa kết luận"}
        </span>
        {item.href ? (
          <Link href={item.href} className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline">
            Luyện thêm <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default async function LearningStrengthPage({
  searchParams,
}: { searchParams: Promise<{ scope?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/nang-luc");

  const query = await searchParams;
  const [profile, attemptRows] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { grade: true } }),
    prisma.attempt.findMany({
      where: { userId: user.id, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 120,
      select: {
        id: true, score: true, maxScore: true,
        exam: {
          select: {
            id: true, title: true, subjectId: true,
            educationLevel: true, grade: true, specialExamTrack: true,
            subject: { select: { name: true, slug: true } },
          },
        },
      },
    }),
  ]);

  const attempts = attemptRows.map((row) => ({
    id: row.id, examId: row.exam.id, examTitle: row.exam.title,
    subjectId: row.exam.subjectId,
    subjectName: row.exam.subject.name,
    subjectSlug: row.exam.subject.slug,
    educationLevel: row.exam.educationLevel,
    grade: row.exam.grade,
    specialExamTrack: row.exam.specialExamTrack,
    score: row.score, maxScore: row.maxScore,
  }));
  const requestedScope = typeof query.scope === "string" && query.scope.length <= 64 ? query.scope : undefined;
  const emptyMap = buildLearningMap(attempts, [], requestedScope, profile?.grade);
  const selectedAttemptIds = attempts.filter((attempt) => scopeOfAttempt(attempt).key === emptyMap.selectedScope).map((attempt) => attempt.id);

  const answerRows = selectedAttemptIds.length ? await prisma.attemptAnswer.findMany({
    where: {
      attemptId: { in: selectedAttemptIds },
      isCorrect: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 8000,
    select: {
      attemptId: true, questionId: true, score: true,
      question: {
        select: {
          type: true, points: true,
          topic: { select: { id: true, name: true } },
        },
      },
    },
  }) : [];

  const insight = buildLearningMap(
    attempts,
    answerRows.map((row) => ({
      attemptId: row.attemptId,
      questionId: row.questionId,
      score: row.score,
      points: row.question.points,
      type: row.question.type,
      topicId: row.question.topic?.id ?? null,
      topicName: row.question.topic?.name ?? null,
    })),
    requestedScope,
    profile?.grade,
  );

  const activeScopeLabel = insight.scopes.find((scope) => scope.key === insight.selectedScope)?.label ?? "Học tập";
  const taggedCount = insight.gradedCount - insight.untaggedCount;

  return (
    <main className="min-h-screen bg-orange-50/30 pb-24">
      <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 sm:py-10">
        <Link href="/dashboard" className="text-sm font-bold text-orange-600 hover:underline">← Trở về trang chủ</Link>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="flex items-center gap-3 text-2xl font-black text-slate-950 sm:text-3xl">
              <BarChart3 className="h-7 w-7 shrink-0 text-orange-500 sm:h-9 sm:w-9" /> Bản đồ năng lực
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Theo dõi điểm mạnh và phần cần cải thiện từ những bài bạn đã nộp, kể cả khi đề chưa được gắn nhãn chuyên đề.
            </p>
          </div>
          <Link href="/so-loi-sai" className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm font-bold text-orange-700 hover:bg-orange-50">
            <BookOpenCheck className="h-4 w-4" /> Ôn lại lỗi sai
          </Link>
        </div>

        {insight.scopes.length > 1 ? (
          <nav aria-label="Chọn lớp hoặc kỳ thi để xem năng lực" className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {insight.scopes.map((scope) => (
              <Link key={scope.key} href={"/nang-luc?scope=" + encodeURIComponent(scope.key)}
                aria-current={scope.key === insight.selectedScope ? "page" : undefined}
                className={"shrink-0 rounded-full border px-4 py-2 text-xs font-extrabold transition sm:text-sm " +
                  (scope.key === insight.selectedScope
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-orange-100 bg-white text-slate-700 hover:border-orange-300")}>
                {scope.label} <span className="ml-1 opacity-70">({scope.count})</span>
              </Link>
            ))}
          </nav>
        ) : null}

        {insight.submittedCount === 0 ? (
          <section className="mt-6 rounded-3xl border border-orange-100 bg-white p-7 text-center shadow-sm sm:p-10">
            <Target className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-xl font-black text-slate-900">Bắt đầu tạo bản đồ học tập</h2>
            <p className="mt-2 text-sm text-slate-500">Chỉ cần hoàn thành một đề bất kỳ, Educhi sẽ hiển thị thống kê theo môn và bài đã làm.</p>
            <Link href="/exams" className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">Khám phá đề thi</Link>
          </section>
        ) : (
          <>
            <section className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="Tổng quan học tập">
              <div className="rounded-2xl border border-orange-100 bg-white px-3 py-4 sm:p-5">
                <p className="text-2xl font-black tabular-nums text-orange-600 sm:text-3xl">{insight.submittedCount}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Lượt làm đề</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white px-3 py-4 sm:p-5">
                <p className="text-2xl font-black tabular-nums text-blue-600 sm:text-3xl">{insight.gradedCount}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Lượt trả lời được chấm</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white px-3 py-4 sm:p-5">
                <p className="text-2xl font-black tabular-nums text-emerald-600 sm:text-3xl">{insight.subjects.length}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">Môn đã luyện</p>
              </div>
            </section>

            <section className="mt-5 rounded-3xl border border-orange-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-orange-600">
                <Lightbulb className="h-5 w-5" /> Gợi ý học tiếp · {activeScopeLabel}
              </div>
              <h2 className="mt-2 text-lg font-black text-slate-900 sm:text-xl">{insight.recommendation.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{insight.recommendation.detail}</p>
              <Link href={insight.recommendation.href} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600">
                Tiếp tục luyện <ArrowRight className="h-4 w-4" />
              </Link>
            </section>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><TrendingUp className="h-5 w-5 text-orange-500" /> Kết quả theo môn</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Điểm trung bình quy về 100% của các bài đã nộp trong từng môn.</p>
                <div className="mt-4 space-y-3">
                  {insight.subjects.map((item) => <ProgressRow key={item.key} item={item} detail={item.count + " lượt làm đề"} />)}
                  {!insight.subjects.length ? <p className="text-sm text-slate-500">Chưa có bài được chấm điểm trong mục này.</p> : null}
                </div>
              </section>

              <section className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Layers3 className="h-5 w-5 text-blue-500" /> Kết quả theo dạng câu</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Tổng điểm nhận được / tổng điểm tối đa ở mỗi dạng câu hỏi.</p>
                <div className="mt-4 space-y-3">
                  {insight.types.map((item) => <ProgressRow key={item.key} item={item} detail={item.count + " lượt trả lời đã chấm"} />)}
                  {!insight.types.length ? <p className="text-sm leading-6 text-slate-500">Chưa có câu trắc nghiệm hoặc trả lời ngắn được chấm trong các bài gần đây. Bạn vẫn xem được điểm theo môn và theo đề.</p> : null}
                </div>
              </section>
            </div>

            <section className="mt-5 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><Target className="h-5 w-5 text-orange-500" /> Chuyên đề đã phân loại</h2>
                <span className="text-xs font-semibold text-slate-500">{taggedCount}/{insight.gradedCount} lượt trả lời có nhãn</span>
              </div>
              {insight.topics.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {insight.topics.map((item) => <ProgressRow key={item.key} item={item} detail={item.count + " lượt trả lời đã chấm"} />)}
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Chưa có nhãn chuyên đề chi tiết</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Không ảnh hưởng đến phân tích theo môn, dạng câu và đề thi ở trang này. Khi quản trị viên phân loại câu hỏi, mục chuyên đề sẽ tự xuất hiện; Educhi không tự đoán chương học từ tên đề.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="mt-5 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="flex items-center gap-2 text-xl font-black text-slate-900"><ClipboardList className="h-5 w-5 text-orange-500" /> Kết quả theo đề đã làm</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Các đề bạn đã luyện trong {activeScopeLabel.toLowerCase()}, hiển thị điểm trung bình nếu làm nhiều lần.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {insight.exams.slice(0, 8).map((item) => (
                  <ProgressRow key={item.key} item={item} detail={item.count + " lượt làm đề"} />
                ))}
              </div>
              {insight.exams.length > 8 ? <p className="mt-4 text-xs text-slate-500">Đang hiển thị 8 đề được làm nhiều nhất trong phạm vi thống kê.</p> : null}
            </section>

            <p className="mt-5 text-xs leading-6 text-slate-500">
              Dữ liệu dựa trên tối đa 120 lượt nộp đề gần đây và 8.000 lượt trả lời đã chấm của phạm vi đang chọn.
              Điểm theo môn/đề là trung bình các lần làm; theo chuyên đề/dạng câu là tỷ lệ điểm thực nhận.
              Những mục ít lượt làm chưa đủ để kết luận chắc chắn. Câu tự luận chưa được chấm tự động không có trong thống kê theo dạng câu.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
