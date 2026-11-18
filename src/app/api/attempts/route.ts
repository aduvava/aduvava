import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAccessExam } from "@/lib/access";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";

const startSchema = z.object({
  examId: z.string().min(1).max(128),
  mode: z.enum(["PRACTICE", "MOCK"]).default("MOCK"),
  timeLimitMinutes: z.number().int().min(5).max(180).optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { examId, mode, timeLimitMinutes } =
      startSchema.parse(await readLimitedJson(request, 4 * 1024));
    const exam = await prisma.exam.findFirst({
      where: { OR: [{ id: examId }, { slug: examId }, { code: examId }], isPublished: true },
      include: { questions: { select: { points: true } } },
    });
    if (!exam) throw new HttpError(404, "Exam not found");

    if (!(await canAccessExam(user.id, exam))) {
      throw new HttpError(403, "You do not have access to this exam");
    }

    const maxScore = exam.questions.reduce((sum, question) => sum + question.points, 0);

    // Serialize starts per user across server instances. Without this lock,
    // concurrent tabs could both observe zero IN_PROGRESS rows and create
    // separate attempts that defeat per-exam EXP limits.
    const outcome = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      if (!locked.length) throw new HttpError(401, "Authentication required");

      const existing = await tx.attempt.findFirst({
        where: { userId: user.id, examId: exam.id, status: "IN_PROGRESS" },
        orderBy: { startedAt: "asc" },
      });
      if (existing) return { attemptId: existing.id, reused: true };

      const attempt = await tx.attempt.create({
        data: {
          userId: user.id,
          examId: exam.id,
          maxScore,
          mode,
          timeLimitMinutes: mode === "PRACTICE" ? (timeLimitMinutes ?? exam.durationMinutes) : null,
        },
      });
      return { attemptId: attempt.id, reused: false };
    }, { maxWait: 10000, timeout: 15000 });

    return jsonOk(outcome, outcome.reused ? 200 : 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
