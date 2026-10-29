import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { lockAttempt, isAttemptExpired } from "@/lib/attempt-lock";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string().min(1),
  value: z.unknown(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const payload = answerSchema.parse(await readJson<unknown>(request));
    if (payload.value === undefined) throw new HttpError(400, "Answer value is required");
    const answer = await prisma.$transaction(async (tx) => {
      const attempt = await lockAttempt(tx, id, user.id);
      if (attempt.status !== "IN_PROGRESS") throw new HttpError(409, "Attempt is closed");
      const exam = await tx.exam.findUniqueOrThrow({ where: { id: attempt.examId }, select: { durationMinutes: true } });
      if (isAttemptExpired(attempt, exam.durationMinutes)) throw new HttpError(409, "Time limit exceeded");
      const question = await tx.question.findFirst({ where: { id: payload.questionId, examId: attempt.examId }, select: { id: true } });
      if (!question) throw new HttpError(404, "Question not found");
      return tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: id, questionId: question.id } },
        update: { value: payload.value as Prisma.InputJsonValue },
        create: { attemptId: id, questionId: question.id, value: payload.value as Prisma.InputJsonValue },
      });
    }, { timeout: 10000, maxWait: 10000 });
    return jsonOk({ answer });
  } catch (error) {
    return handleRouteError(error);
  }
}
