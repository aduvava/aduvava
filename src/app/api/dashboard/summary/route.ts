import { prisma } from "@/lib/db";
import { handleRouteError, jsonOk, requireUser } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const attempts = await prisma.attempt.findMany({
      where: { userId: user.id, status: "SUBMITTED" },
      include: { exam: { include: { subject: true } }, resultSummary: true },
      orderBy: { submittedAt: "desc" },
      take: 20
    });

    const average = attempts.length ? attempts.reduce((sum, attempt) => sum + (attempt.maxScore ? attempt.score / attempt.maxScore : 0), 0) / attempts.length : 0;
    const bySubject = new Map<string, { subject: string; attempts: number; score: number }>();
    for (const attempt of attempts) {
      const key = attempt.exam.subject.name;
      const current = bySubject.get(key) ?? { subject: key, attempts: 0, score: 0 };
      current.attempts += 1;
      current.score += attempt.maxScore ? attempt.score / attempt.maxScore : 0;
      bySubject.set(key, current);
    }

    return jsonOk({
      totalAttempts: attempts.length,
      averagePercent: Math.round(average * 100),
      recentAttempts: attempts,
      bySubject: Array.from(bySubject.values()).map((item) => ({ ...item, averagePercent: Math.round((item.score / item.attempts) * 100) }))
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
