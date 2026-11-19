import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { canAccessExam } from "@/lib/access";
import { readLimitedJson } from "@/lib/limited-json";
import { scoreQuestion } from "@/lib/scoring";
import { nextReviewState } from "@/lib/review-schedule";

const inputSchema = z.object({
  itemId: z.string().min(1).max(128),
  value: z.unknown(),
});

export async function GET() {
  try {
    const user = await requireUser();
    const now = new Date();
    const [items, total, mastered] = await Promise.all([
      prisma.reviewItem.findMany({
        where: { userId: user.id, masteredAt: null, nextReviewAt: { lte: now } },
        include: {
          question: {
            include: {
              topic: true,
              answerOptions: { select: { id: true, label: true, content: true } },
              exam: { include: { subject: true } },
            },
          },
        },
        orderBy: [{ nextReviewAt: "asc" }, { lastWrongAt: "desc" }],
        take: 30,
      }),
      prisma.reviewItem.count({ where: { userId: user.id } }),
      prisma.reviewItem.count({ where: { userId: user.id, masteredAt: { not: null } } }),
    ]);

    // Do not expose questions from private/expired or unpublished exams.
    const accessible = await Promise.all(items.map(async (item) => ({
      item,
      allowed: item.question.exam.isPublished && await canAccessExam(user.id, item.question.exam),
    })));
    const safeItems = accessible.filter(({ item, allowed }) => allowed && item.question.type !== "ESSAY")
      .slice(0, 15).map(({ item }) => ({
        id: item.id,
        wrongCount: item.wrongCount,
        question: {
          id: item.question.id,
          type: item.question.type,
          prompt: item.question.prompt,
          passage: item.question.passage,
          points: item.question.points,
          options: item.question.answerOptions,
        },
        subject: item.question.exam.subject.name,
        topic: item.question.topic?.name ?? "Chưa phân loại",
        examTitle: item.question.exam.title,
      }));

    return jsonOk({ total, mastered, pending: total - mastered, items: safeItems });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { itemId, value } = inputSchema.parse(await readLimitedJson(request, 4096));
    const item = await prisma.reviewItem.findFirst({
      where: { id: itemId, userId: user.id, masteredAt: null },
      include: { question: { include: { exam: true, answerOptions: true } } },
    });
    if (!item || !item.question.exam.isPublished) throw new HttpError(404, "Câu hỏi không còn khả dụng.");
    if (!(await canAccessExam(user.id, item.question.exam))) throw new HttpError(403, "Không có quyền truy cập đề này.");
    const now = new Date();
    if (item.nextReviewAt > now) throw new HttpError(409, "Câu hỏi chưa đến lịch ôn lại.");

    const question = item.question;
    if (question.type === "ESSAY") throw new HttpError(400, "Chưa hỗ trợ ôn tự luận.");
    if (question.type === "SINGLE_CHOICE") {
      if (typeof value !== "string" || !question.answerOptions.some((option) => option.id === value)) {
        throw new HttpError(400, "Vui lòng chọn đáp án hợp lệ.");
      }
    } else if (question.type === "SHORT_ANSWER") {
      if (typeof value !== "string" || !value.trim() || value.length > 500) {
        throw new HttpError(400, "Vui lòng nhập câu trả lời hợp lệ.");
      }
    } else if (question.type === "TRUE_FALSE_SET") {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Vui lòng chọn Đúng/Sai.");
      const input = value as Record<string, unknown>;
      if (Object.keys(input).length !== question.answerOptions.length ||
          !question.answerOptions.every((option) => typeof input[option.id] === "boolean")) {
        throw new HttpError(400, "Vui lòng trả lời đầy đủ các ý.");
      }
    }

    const scored = scoreQuestion({
      id: question.id,
      type: question.type,
      points: question.points,
      correctText: question.correctText,
      answerOptions: question.answerOptions,
    }, value);
    const correct = scored.isCorrect === true;
    const schedule = nextReviewState(item.correctStreak, correct, now);
    const updated = await prisma.reviewItem.updateMany({
      where: { id: item.id, userId: user.id, masteredAt: null, nextReviewAt: { lte: now } },
      data: {
        reviewCount: { increment: 1 },
        correctStreak: schedule.correctStreak,
        masteredAt: schedule.masteredAt,
        nextReviewAt: schedule.nextReviewAt,
        lastReviewedAt: now,
      },
    });
    if (!updated.count) throw new HttpError(409, "Câu hỏi đã được ghi nhận ở phiên khác.");
    return jsonOk({
      isCorrect: correct,
      score: scored.score,
      maxScore: scored.maxScore,
      mastered: Boolean(schedule.masteredAt),
      explanation: question.explanation,
      correctText: question.correctText,
      correctOptions: question.answerOptions.filter((option) => option.isCorrect).map((option) => ({
        id: option.id, label: option.label,
      })),
      nextReviewAt: schedule.nextReviewAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
