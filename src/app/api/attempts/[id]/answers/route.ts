import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAccessExam } from "@/lib/access";
import { isAttemptExpired } from "@/lib/attempt-timing";
import { readLimitedJson } from "@/lib/limited-json";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string().min(1).max(128),
  value: z.unknown(),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const payload = answerSchema.parse(await readLimitedJson(request, 16 * 1024));

    // A row lock serializes saves for the same attempt. Check the server clock
    // after acquiring the lock: a paused browser cannot submit late answers.
    const answer = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Attempt" WHERE "id" = ${id} AND "userId" = ${user.id} FOR UPDATE
      `;
      if (!rows.length) throw new HttpError(404, "Attempt not found");
      const attempt = await tx.attempt.findFirst({
        where: { id, userId: user.id },
        include: { exam: true },
      });
      if (!attempt) throw new HttpError(404, "Attempt not found");
      if (attempt.status !== "IN_PROGRESS") throw new HttpError(409, "Attempt is already submitted");
      if (isAttemptExpired(attempt)) {
        throw new HttpError(409, "Hết giờ làm bài. Hãy nộp bài để chấm các đáp án đã lưu.");
      }
      if (!(await canAccessExam(user.id, attempt.exam))) {
        throw new HttpError(403, "Bạn không còn quyền truy cập đề thi này.");
      }

      const question = await tx.question.findFirst({
        where: { id: payload.questionId, examId: attempt.examId },
        select: { id: true },
      });
      if (!question) throw new HttpError(404, "Question not found");

      return tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
        update: { value: payload.value as object },
        create: { attemptId: attempt.id, questionId: question.id, value: payload.value as object },
      });
    }, { timeout: 10000 });

    return jsonOk({ answer });
  } catch (error) {
    return handleRouteError(error);
  }
}
