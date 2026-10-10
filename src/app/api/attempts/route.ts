import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAccessExam } from "@/lib/access";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const startSchema = z.object({ examId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { examId } = startSchema.parse(await readJson<unknown>(request));
    const exam = await prisma.exam.findFirst({
      where: { OR: [{ id: examId }, { slug: examId }, { code: examId }], isPublished: true },
      include: { questions: true }
    });
    if (!exam) throw new HttpError(404, "Exam not found");

    const allowed = await canAccessExam(user.id, exam);
    if (!allowed) throw new HttpError(402, "Active subscription required");

    const existing = await prisma.attempt.findFirst({ where: { userId: user.id, examId: exam.id, status: "IN_PROGRESS" } });
    if (existing) return jsonOk({ attemptId: existing.id, reused: true });

    const maxScore = exam.questions.reduce((sum, question) => sum + question.points, 0);
    const attempt = await prisma.attempt.create({ data: { userId: user.id, examId: exam.id, maxScore } });
    return jsonOk({ attemptId: attempt.id, reused: false }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
