import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { calculateExamExp, getVietnamDayRange } from "@/lib/exp-system";
import { createMockEssayFeedback } from "@/lib/mock-ai";
import { scoreExam, type ScoringQuestion } from "@/lib/scoring";

function buildLiteratureRubric(maxScore: number) {
  return [
    `Chấm bài tự luận Ngữ Văn theo thang ${maxScore} điểm.`,
    "Đọc hiểu: đánh giá khả năng nắm nội dung, nhận diện phương thức biểu đạt, phân tích từ khóa và trả lời đúng trọng tâm.",
    "Làm văn: đánh giá bố cục, luận điểm, dẫn chứng, lập luận, diễn đạt, chính tả và mức độ bám sát yêu cầu đề bài.",
    "Trả về JSON gồm điểm, nhận xét điểm mạnh, lỗi cần sửa và gợi ý cải thiện.",
  ].join("\n");
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const attempt = await prisma.attempt.findFirst({
      where: { id, userId: user.id },
      include: {
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

    if (!attempt) throw new HttpError(404, "Attempt not found");
    if (attempt.status === "SUBMITTED") {
      return jsonOk({ attemptId: attempt.id, resultId: attempt.id, score: attempt.score, maxScore: attempt.maxScore });
    }

    const questions = attempt.exam.questions.map((question) => ({
      id: question.id,
      type: question.type,
      points: question.points,
      correctText: question.correctText,
      topic: question.topic ? { id: question.topic.id, name: question.topic.name } : null,
      answerOptions: question.answerOptions.map((option) => ({
        id: option.id,
        label: option.label,
        content: option.content,
        isCorrect: option.isCorrect,
      })),
    })) satisfies ScoringQuestion[];

    const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    const baseResult = scoreExam(questions, attempt.answers.map((answer) => ({ questionId: answer.questionId, value: answer.value })));
    const questionScores = [...baseResult.questionScores];

    if (attempt.exam.subject.slug === "ngu-van") {
      await Promise.all(
        attempt.exam.questions.map(async (question) => {
          if (question.type !== "ESSAY") return;
          const answer = answerMap.get(question.id);
          const answerText = String(answer?.value ?? "").trim();
          if (!answerText) return;

          const output = await createMockEssayFeedback({
            prompt: [question.passage, question.prompt].filter(Boolean).join("\n\n"),
            answer: answerText,
            rubric: buildLiteratureRubric(question.points),
          });
          const scaledScore = Number(((output.score / output.maxScore) * question.points).toFixed(2));
          const index = questionScores.findIndex((item) => item.questionId === question.id);
          if (index >= 0) {
            questionScores[index] = { questionId: question.id, isCorrect: null, score: scaledScore, maxScore: question.points };
          }

          await prisma.aiFeedback.create({
            data: {
              userId: user.id,
              type: "essay-feedback",
              input: {
                attemptId: attempt.id,
                examId: attempt.examId,
                questionId: question.id,
                prompt: question.prompt,
                answer: answerText,
                rubric: buildLiteratureRubric(question.points),
              },
              output,
            },
          });
        }),
      );
    }

    const result = {
      score: Number(questionScores.reduce((sum, item) => sum + item.score, 0).toFixed(2)),
      maxScore: baseResult.maxScore,
      questionScores,
    };
    const scoreByQuestion = new Map(result.questionScores.map((item) => [item.questionId, item]));

    await Promise.all(
      attempt.exam.questions.map((question) => {
        const current = answerMap.get(question.id);
        const scored = scoreByQuestion.get(question.id);
        return prisma.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
          update: { isCorrect: scored?.isCorrect ?? null, score: scored?.score ?? 0 },
          create: {
            attemptId: attempt.id,
            questionId: question.id,
            value: current?.value ?? Prisma.JsonNull,
            isCorrect: scored?.isCorrect ?? null,
            score: scored?.score ?? 0,
          },
        });
      }),
    );

    const topicStats = new Map<string, { name: string; score: number; maxScore: number }>();
    for (const question of questions) {
      if (!question.topic) continue;
      const scored = scoreByQuestion.get(question.id);
      const current = topicStats.get(question.topic.id) ?? { name: question.topic.name, score: 0, maxScore: 0 };
      current.score += scored?.score ?? 0;
      current.maxScore += question.points;
      topicStats.set(question.topic.id, current);
    }

    const topicScores = Array.from(topicStats.entries()).map(([topicId, item]) => ({
      topicId,
      ...item,
      ratio: item.maxScore ? item.score / item.maxScore : 0,
    }));
    const weakTopics = topicScores.filter((item) => item.ratio < 0.6);
    const now = new Date();
    const durationSeconds = Math.max(0, Math.round((now.getTime() - attempt.startedAt.getTime()) / 1000));
    const feedback =
      result.maxScore && result.score / result.maxScore >= 0.8
        ? "Bạn đang kiểm soát tốt đề này. Ưu tiên luyện tốc độ và giảm lỗi sai nhỏ."
        : "Nên chữa kỹ câu sai và ôn lại các chuyên đề yếu trước khi làm đề mới.";

    await prisma.resultSummary.upsert({
      where: { attemptId: attempt.id },
      update: { weakTopics, topicScores, feedback },
      create: { attemptId: attempt.id, weakTopics, topicScores, feedback },
    });

    const dayRange = getVietnamDayRange(now);
    const previousAttemptCount = await prisma.attempt.count({
      where: {
        userId: user.id,
        examId: attempt.examId,
        status: "SUBMITTED",
        id: { not: attempt.id },
      },
    });
    const [todayEarned, activity] = await Promise.all([
      prisma.walletTransaction.aggregate({
        where: {
          userId: user.id,
          currency: "EXP",
          reason: "EXAM_COMPLETED",
          amount: { gt: 0 },
          createdAt: { gte: dayRange.start, lt: dayRange.end },
        },
        _sum: { amount: true },
      }),
      prisma.walletTransaction.findMany({
        where: {
          userId: user.id,
          currency: "EXP",
          reason: "EXAM_COMPLETED",
          amount: { gt: 0 },
          createdAt: { lt: dayRange.end },
        },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
    ]);
    const expBreakdown = calculateExamExp({
      questionScores: result.questionScores,
      score: result.score,
      maxScore: result.maxScore,
      durationSeconds,
      durationMinutes: attempt.exam.durationMinutes,
      examType: attempt.exam.type,
      examStructure: attempt.exam.examStructure,
      previousAttemptCount,
      todayEarnedExp: todayEarned._sum.amount ?? 0,
      activityDates: activity.map((item) => item.createdAt),
      now,
    });
    const expReward = expBreakdown.expReward;
    const expNote =
      expReward > 0
        ? `Hoàn thành ${attempt.exam.title}: +${expReward} EXP`
        : previousAttemptCount >= 2
          ? `Hoàn thành ${attempt.exam.title}: không cộng EXP vì đã làm đề này từ lần 3`
          : `Hoàn thành ${attempt.exam.title}: không cộng EXP vì đã đạt giới hạn EXP hôm nay`;

    await prisma.$transaction([
      prisma.attempt.update({
        where: { id: attempt.id },
        data: { status: "SUBMITTED", submittedAt: now, durationSeconds, score: result.score, maxScore: result.maxScore },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { exp: { increment: expReward } },
      }),
      prisma.walletTransaction.create({
        data: {
          userId: user.id,
          currency: "EXP",
          amount: expReward,
          reason: "EXAM_COMPLETED",
          reference: `attempt-exp-${attempt.id}`,
          note: expNote,
          metadata: {
            attemptId: attempt.id,
            examId: attempt.examId,
            score: result.score,
            maxScore: result.maxScore,
            expSystem: expBreakdown,
          },
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          title: expReward > 0 ? `Bạn nhận được ${expReward} EXP` : "Bài làm đã được ghi nhận",
          message: expReward > 0 ? `Hoàn thành ${attempt.exam.title} đã giúp bạn tích lũy thêm EXP.` : expNote,
          href: `/results/${attempt.id}`,
        },
      }),
    ]);

    return jsonOk({ attemptId: attempt.id, resultId: attempt.id, score: result.score, maxScore: result.maxScore, weakTopics, expReward, expBreakdown });
  } catch (error) {
    return handleRouteError(error);
  }
}
