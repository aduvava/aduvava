import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const answerSchema = z.object({
  questionId: z.string().min(1),
  value: z.unknown()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const payload = answerSchema.parse(await readJson<unknown>(request));
    const attempt = await prisma.attempt.findFirst({ where: { id, userId: user.id }, include: { exam: true } });
    if (!attempt) throw new HttpError(404, "Attempt not found");
    if (attempt.status !== "IN_PROGRESS") throw new HttpError(409, "Attempt is already submitted");

    const question = await prisma.question.findFirst({ where: { id: payload.questionId, examId: attempt.examId } });
    if (!question) throw new HttpError(404, "Question not found");

    const answer = await prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
      update: { value: payload.value as object },
      create: { attemptId: attempt.id, questionId: question.id, value: payload.value as object }
    });

    return jsonOk({ answer });
  } catch (error) {
    return handleRouteError(error);
  }
}
