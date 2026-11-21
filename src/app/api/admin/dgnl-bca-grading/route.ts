import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireAdmin } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";

const gradeSchema = z.object({
  attemptId: z.string().min(1).max(128),
  questionId: z.string().min(1).max(128),
  score: z.number().finite().min(0).max(25),
  comment: z.string().max(2000).default(""),
}).strict();

export async function POST(request: Request) {
  try {
    const grader = await requireAdmin();
    const input = gradeSchema.parse(await readLimitedJson(request, 12 * 1024));
    if (Math.round(input.score * 4) !== input.score * 4) {
      throw new HttpError(400, "Điểm tự luận phải là bội số 0,25.");
    }
    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Attempt" WHERE "id" = ${input.attemptId} FOR UPDATE
      `;
      if (!lock.length) throw new HttpError(404, "Không tìm thấy bài làm.");
      const attempt = await tx.attempt.findFirst({
        where: { id: input.attemptId, status: "SUBMITTED", exam: { specialExamTrack: "DGNL_BCA" } },
        select: { id: true, userId: true, examId: true },
      });
      if (!attempt) throw new HttpError(404, "Chỉ chấm được bài BCA đã nộp.");
      const question = await tx.question.findFirst({
        where: { id: input.questionId, examId: attempt.examId, type: "ESSAY" },
        select: { id: true, points: true },
      });
      if (!question || input.score > question.points) throw new HttpError(400, "Điểm vượt thang điểm câu tự luận.");
      await tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
        update: { score: input.score, isCorrect: null },
        create: { attemptId: attempt.id, questionId: question.id, value: "", score: input.score, isCorrect: null },
      });
      const answers = await tx.attemptAnswer.findMany({
        where: { attemptId: attempt.id }, select: { score: true },
      });
      const score = Number(answers.reduce((sum, answer) => sum + answer.score, 0).toFixed(2));
      await tx.attempt.update({ where: { id: attempt.id }, data: { score } });
      await tx.aiFeedback.create({
        data: {
          userId: attempt.userId, type: "manual-essay-grade",
          input: { attemptId: attempt.id, questionId: question.id, graderId: grader.id },
          output: { score: input.score, maxScore: question.points, comment: input.comment, gradedAt: new Date().toISOString() },
        },
      });
      return { score, maxScore: 100 };
    }, { maxWait: 10000, timeout: 15000 });
    return jsonOk({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}
