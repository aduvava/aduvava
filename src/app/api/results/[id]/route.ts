import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const attempt = await prisma.attempt.findFirst({
      where: { id, userId: user.id },
      include: {
        resultSummary: true,
        exam: { include: { subject: true, questions: { orderBy: { position: "asc" }, include: { answerOptions: true, topic: true } } } },
        answers: true
      }
    });
    if (!attempt) throw new HttpError(404, "Result not found");
    if (attempt.status !== "SUBMITTED") throw new HttpError(409, "Attempt is not submitted");
    return jsonOk({ attempt });
  } catch (error) {
    return handleRouteError(error);
  }
}
