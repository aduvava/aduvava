import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Gem, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canAccessExam } from "@/lib/access";
import { getQuestionPartLabel } from "@/lib/national-exam-rules";
import { RichContent as FormattedContent } from "@/components/rich-content";
import { ExamMathPrompt } from "@/components/exam-math-prompt";
import { hasCorruptedPdfMath } from "@/lib/math-latex";
import { AttemptStartButton } from "@/components/attempt-start-button";
import { getAssessmentBlock, getAssessmentRule, getAssessmentVariant } from "@/lib/special-exam-rules";

function hasAnswer(type: string, value: unknown, optionCount: number) {
  if (type === "TRUE_FALSE_SET") {
    const object = typeof value === "object" && value !== null ? value as Record<string, boolean> : {};
    return Object.keys(object).length === optionCount;
  }
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=/results/${id}`);

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: user.id },
    include: {
      resultSummary: true,
      answers: true,
      exam: {
        include: {
          subject: true,
          questions: {
            orderBy: { position: "asc" },
            include: { answerOptions: true, topic: true },
          },
        },
      },
    },
  });

  if (!attempt) notFound();
  if (attempt.status !== "SUBMITTED") redirect(`/attempts/${attempt.id}`);
  if (!(await canAccessExam(user.id, attempt.exam))) notFound();

  const expTransaction = await prisma.walletTransaction.findUnique({
    where: { reference: `attempt-exp-${attempt.id}` },
  });

  const essayFeedbacks = await prisma.aiFeedback.findMany({
    where: { userId: user.id, type: { in: ["essay-feedback", "manual-essay-grade"] } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const aiFeedbackByQuestion = new Map<string, Record<string, unknown>>();
  const manualGradeByQuestion = new Map<string, Record<string, unknown>>();
  for (const feedback of essayFeedbacks) {
    const input = asRecord(feedback.input);
    const output = asRecord(feedback.output);
    if (input?.attemptId === attempt.id && typeof input.questionId === "string" && output) {
      if (feedback.type === "manual-essay-grade" && !manualGradeByQuestion.has(input.questionId)) {
        manualGradeByQuestion.set(input.questionId, output);
      } else if (feedback.type === "essay-feedback" && !aiFeedbackByQuestion.has(input.questionId)) {
        aiFeedbackByQuestion.set(input.questionId, output);
      }
    }
  }

  const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
  const skippedCount = attempt.exam.questions.filter((question) => {
    const answer = answers.get(question.id);
    return !hasAnswer(question.type, answer?.value, question.answerOptions.length);
  }).length;
  const structure = asRecord(attempt.exam.examStructure);
  const storedVariant = typeof structure?.variantId === "string" ? structure.variantId : null;
  const assessmentVariant = storedVariant ? getAssessmentVariant(attempt.exam.specialExamTrack, storedVariant) : null;
  const assessmentRule = assessmentVariant ? getAssessmentRule(attempt.exam.specialExamTrack) : null;
  const pendingEssays = attempt.exam.questions.some((question) =>
    question.type === "ESSAY" && !manualGradeByQuestion.has(question.id));
  const objectiveMax = attempt.exam.questions
    .filter((question) => question.type !== "ESSAY")
    .reduce((sum, question) => sum + question.points, 0);
  const groups = Array.from(
    attempt.exam.questions.reduce((map, question) => {
      const section = assessmentVariant ? getAssessmentBlock(assessmentVariant, question.position) : null;
      const label = section ? section.sectionLabel + " – " + section.label : getQuestionPartLabel(question.type);
      const items = map.get(label) ?? [];
      items.push(question);
      map.set(label, items);
      return map;
    }, new Map<string, typeof attempt.exam.questions>()),
  );

  const normalizedScore = attempt.maxScore ? (attempt.score / attempt.maxScore) * 10 : 0;
  const minutes = Math.floor(attempt.durationSeconds / 60);
  const seconds = attempt.durationSeconds % 60;
  const expSystem = asRecord(asRecord(expTransaction?.metadata)?.expSystem);
  const difficultyLabel = String(expSystem?.difficultyLabel ?? "");
  const difficultyText = difficultyLabel === "hard" ? "Khó" : difficultyLabel === "medium" ? "Trung bình" : "Dễ";

  return (
    <div className="result-page min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold text-slate-500 hover:text-orange-500">
          <ArrowLeft className="h-5 w-5" /> Trở về trang chủ
        </Link>

        <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <h1 className="text-center text-3xl font-black text-slate-900">{assessmentRule?.scoreMode === "IRT" ? "Kết quả luyện tập ĐGNL" : "Kết quả bài làm"}</h1>
          <p className="mt-2 text-center font-semibold text-slate-500">{attempt.exam.title}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-8 sm:flex-row">
            <div className="text-center sm:border-r sm:border-slate-200 sm:pr-12">
              <p className="text-6xl font-black text-orange-500">
                {assessmentRule ? attempt.score.toFixed(2).replace(/\.00$/, "") : normalizedScore.toFixed(2)}
              </p>
              <p className="mt-2 text-sm font-black uppercase tracking-wide text-slate-500">
                {assessmentRule?.scoreMode === "IRT"
                  ? "Điểm thô luyện tập / " + attempt.maxScore + " câu"
                  : assessmentRule?.scoreMode === "ESSAY_PENDING"
                    ? pendingEssays ? "Điểm trắc nghiệm / " + objectiveMax.toFixed(0) + " · chờ chấm tự luận" : "Tổng điểm đã chấm / " + attempt.maxScore
                    : assessmentRule ? "Điểm / " + attempt.maxScore : "Tổng điểm (hệ số 10)"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-10 text-center">
              <div>
                <p className="text-3xl font-black text-slate-900">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</p>
                <p className="mt-1 text-xs font-bold uppercase text-slate-500">Thời gian làm bài</p>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900">{skippedCount}</p>
                <p className="mt-1 text-xs font-bold uppercase text-slate-500">Câu bỏ qua</p>
              </div>
            </div>
          </div>

          {assessmentRule?.scoreMode === "IRT" ? (
            <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold leading-7 text-amber-900">
              Đây là số điểm thô/số câu đạt khi luyện trên Educhi, không phải điểm thi chính thức theo IRT.
              {attempt.exam.specialExamTrack === "V_ACT" ? " V-ACT sử dụng thang chuẩn hóa tối đa 1.200 điểm." : " TSA sử dụng thang điểm chuẩn hóa tối đa 100 điểm."}
              Không thể quy đổi chính xác từ số câu đúng khi chưa có tham số câu hỏi và dữ liệu hiệu chuẩn.
            </div>
          ) : null}
          {assessmentRule?.scoreMode === "ESSAY_PENDING" ? (
            <div className="mt-7 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm font-semibold leading-7 text-blue-900">
              Bài ĐGNL BCA gồm 75 điểm trắc nghiệm được chấm tự động và 25 điểm tự luận.
              {pendingEssays ? "Điểm tự luận đang chờ Admin chấm, chưa có tổng điểm cuối cùng trên thang 100." : "Admin đã chấm tự luận; tổng điểm trên thang 100 đã được cập nhật."}
            </div>
          ) : null}
          {attempt.exam.specialExamTrack && !assessmentVariant ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
              Đây là đề ĐGNL nhập theo cấu trúc cũ, chưa được hệ thống đối chiếu đủ các phần thi.
            </div>
          ) : null}
          {expTransaction && expSystem ? (
            <div className="mt-10 rounded-3xl border border-blue-100 bg-blue-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-blue-600">
                    <Gem className="h-5 w-5 fill-blue-500" /> EXP nhận được
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-slate-950">{expTransaction.amount.toLocaleString("vi-VN")} EXP</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">{expTransaction.note}</p>
                </div>
                <div className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm">
                  {asNumber(expSystem.correctCount).toLocaleString("vi-VN")}/{asNumber(expSystem.totalQuestions).toLocaleString("vi-VN")} câu đúng · Độ khó {difficultyText} x{asNumber(expSystem.difficultyMultiplier, 1)}
                </div>
              </div>
              {expSystem.rankedEligible !== false ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Điểm cơ bản</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{asNumber(expSystem.baseExp).toLocaleString("vi-VN")} EXP</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Thưởng tốc độ</p>
                  <p className="mt-1 text-xl font-black text-emerald-600">+{asNumber(expSystem.speedBonus).toLocaleString("vi-VN")} EXP</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Thưởng hoàn hảo</p>
                  <p className="mt-1 text-xl font-black text-orange-600">+{asNumber(expSystem.perfectBonus).toLocaleString("vi-VN")} EXP</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Chuỗi ngày</p>
                  <p className="mt-1 text-xl font-black text-blue-600">{asNumber(expSystem.streakDays).toLocaleString("vi-VN")} ngày · x{asNumber(expSystem.streakMultiplier, 1)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Làm lại đề</p>
                  <p className="mt-1 text-xl font-black text-slate-900">Lần {asNumber(expSystem.previousAttemptCount) + 1} · x{asNumber(expSystem.repeatRate, 1)}</p>
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Giới hạn ngày</p>
                  <p className="mt-1 text-xl font-black text-slate-900">{asNumber(expSystem.todayEarnedBefore).toLocaleString("vi-VN")}/{asNumber(expSystem.dailyCap).toLocaleString("vi-VN")} EXP</p>
                  {asNumber(expSystem.dailyCapReduction) > 0 ? (
                    <p className="mt-1 text-xs font-bold text-red-500">Đã giảm {asNumber(expSystem.dailyCapReduction).toLocaleString("vi-VN")} EXP do chạm giới hạn.</p>
                  ) : null}
                </div>
              </div>
              ) : null}

            </div>
          ) : null}

          <div className="mt-10 rounded-3xl bg-slate-50 p-6">
            <h2 className="text-xl font-black text-slate-900">{assessmentVariant ? "Phân tích theo phần thi ĐGNL" : "Phân tích độ chính xác theo dạng bài"}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {groups.map(([label, questions], groupIndex) => {
                const groupAnswers = questions.map((question) => answers.get(question.id));
                const earned = groupAnswers.reduce((sum, answer) => sum + (answer?.score ?? 0), 0);
                const maximum = questions.reduce((sum, question) => sum + question.points, 0);
                const percent = maximum ? Math.round((earned / maximum) * 100) : 0;
                const awaitingEssay = questions.every((question) => question.type === "ESSAY" && !manualGradeByQuestion.has(question.id));
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-600">{label}</p>
                      <span className={groupIndex === 0 ? "font-black text-orange-500" : groupIndex === 1 ? "font-black text-blue-600" : "font-black text-emerald-600"}>{awaitingEssay ? "Chưa chấm" : percent + "%"}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div className={groupIndex === 0 ? "h-full bg-orange-500" : groupIndex === 1 ? "h-full bg-blue-500" : "h-full bg-emerald-500"} style={{ width: `${awaitingEssay ? 0 : percent}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{awaitingEssay ? "Tự luận cần chấm thủ công (" + maximum.toFixed(0) + " điểm)" : earned.toFixed(2) + "/" + maximum.toFixed(2) + " điểm"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/so-loi-sai" className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-extrabold text-white hover:bg-orange-600">
            📚 Luyện lại câu sai
          </Link>
          <Link href="/nang-luc" className="rounded-xl border border-orange-200 bg-white px-5 py-3 text-sm font-extrabold text-orange-700 hover:bg-orange-50">
            📊 Xem điểm yếu theo chuyên đề
          </Link>
        </div>
        <h2 className="mt-10 text-3xl font-black text-slate-900">Xem lại chi tiết</h2>
        <div className="mx-auto mt-6 max-w-5xl space-y-6">
          {attempt.exam.questions.map((question) => {
            const answer = answers.get(question.id);
            const isCorrect = answer?.isCorrect === true;
            const selectedValue = answer?.value;
            const aiFeedback = aiFeedbackByQuestion.get(question.id);
            const photoChoices = attempt.exam.specialExamTrack === "HSA" && question.position <= 50 &&
              /!\[[^\]]*\]\(data:image\//.test(question.prompt) &&
              (hasCorruptedPdfMath(question.prompt) || (question.prompt.match(/\n/g)?.length ?? 0) >= 3);
            return (
              <article key={question.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <span className={isCorrect ? "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" : "grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500 text-white"}>
                      {isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                    </span>
                    <div>
                      <p className="text-lg font-black text-slate-900">{getQuestionPartLabel(question.type)} - Câu {question.position}</p>
                      <div className="mt-3">
                        <ExamMathPrompt prompt={question.prompt} track={attempt.exam.specialExamTrack}
                          position={question.position} kind={question.type} />
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-500">{answer?.score ?? 0}/{question.points} điểm</span>
                </div>

                {question.type === "SINGLE_CHOICE" ? (
                  <div className="mx-auto mt-6 grid max-w-4xl gap-3">
                    {question.answerOptions.map((option) => {
                      const selected = selectedValue === option.id;
                      return (
                        <div key={option.id} className={
                          option.isCorrect
                            ? "flex items-center gap-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-5 py-3.5 text-emerald-800"
                            : selected
                              ? "flex items-center gap-4 rounded-2xl border-2 border-red-500 bg-red-50 px-5 py-3.5 text-red-700"
                              : "flex items-center gap-4 rounded-2xl border border-slate-200 px-5 py-3.5 text-slate-600"
                        }>
                          <span className={option.isCorrect ? "grid h-8 w-8 place-items-center rounded-full bg-emerald-500 font-black text-white" : selected ? "grid h-8 w-8 place-items-center rounded-full bg-red-500 font-black text-white" : "grid h-8 w-8 place-items-center rounded-full bg-slate-100 font-black"}>{option.label}</span>
                          {photoChoices ? <span className="text-xs font-medium">Phương án trong ảnh đề gốc</span>
                            : <FormattedContent value={option.content} className="font-semibold" />}
                          {selected ? <span className="ml-auto text-xs font-black uppercase">Bạn chọn</span> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mx-auto mt-6 max-w-4xl rounded-2xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
                    <p><strong>Đáp án của bạn:</strong> {JSON.stringify(selectedValue ?? "Chưa trả lời")}</p>
                    {question.correctText ? <div className="mt-2"><strong>Đáp án đúng:</strong> <FormattedContent value={question.correctText} /></div> : null}
                  </div>
                )}

                {question.type === "ESSAY" && aiFeedback ? (
                  <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-orange-100 bg-orange-50 p-5 text-orange-900">
                    <p className="font-black">AI nhận xét bài tự luận</p>
                    <p className="mt-2 text-sm leading-7">
                      Điểm gợi ý: <strong>{String(aiFeedback.score ?? "-")}/{String(aiFeedback.maxScore ?? "10")}</strong>
                    </p>
                    {typeof aiFeedback.comment === "string" ? <p className="mt-2 text-sm leading-7">{aiFeedback.comment}</p> : null}
                    {Array.isArray(aiFeedback.strengths) ? (
                      <p className="mt-2 text-sm leading-7"><strong>Điểm mạnh:</strong> {aiFeedback.strengths.join(", ")}</p>
                    ) : null}
                    {Array.isArray(aiFeedback.improvements) ? (
                      <p className="mt-2 text-sm leading-7"><strong>Cần cải thiện:</strong> {aiFeedback.improvements.join(", ")}</p>
                    ) : null}
                  </div>
                ) : null}

                {question.explanation ? (
                  <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-800">
                    <p className="flex items-center gap-2 font-black"><BookOpen className="h-5 w-5" /> Lời giải chi tiết</p>
                    {hasCorruptedPdfMath(question.explanation) ? (
                      <p className="mt-2 text-sm font-semibold leading-7 text-amber-800">
                        Lời giải gốc chứa công thức lỗi khi chuyển từ PDF. Nội dung này cần được quản trị viên đối chiếu và hiệu đính bằng LaTeX.
                      </p>
                    ) : <FormattedContent value={question.explanation} className="mt-2 text-sm leading-7" />}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <section className="mx-auto mt-8 max-w-5xl rounded-[1.5rem] border border-orange-100 bg-white px-5 py-6 text-center shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Bạn muốn luyện tập thêm?</h2>
          <p className="mt-2 text-sm text-slate-500">Làm lại cùng đề thi với một lượt làm bài mới. Điểm và kết quả lần trước vẫn được lưu.</p>
          <div className="mt-5 flex justify-center">
            <AttemptStartButton examId={attempt.exam.id} label="↻ Làm lại đề" />
          </div>
        </section>
      </div>
    </div>
  );
}
