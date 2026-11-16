import { prisma } from "@/lib/db";
import { canAccessExam } from "@/lib/access";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

export const dynamic = "force-dynamic";

// Correct answers are never included in the exam runner payload.
// Only an authenticated practice attempt with a saved answer may reveal feedback.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const { id, questionId } = await params;
    const user = await requireUser();
    const attempt = await prisma.attempt.findFirst({
      where: { id, userId: user.id },
      include: { exam: true },
    });
    if (!attempt) throw new HttpError(404, "Không tìm thấy lượt làm bài.");
    if (!(await canAccessExam(user.id, attempt.exam))) throw new HttpError(403, "Không có quyền truy cập.");
    if (attempt.mode !== "PRACTICE") throw new HttpError(403, "Chế độ thi thử chỉ xem đáp án sau khi nộp bài.");
    if (attempt.status !== "IN_PROGRESS") throw new HttpError(409, "Bài làm đã kết thúc.");
    const question = await prisma.question.findFirst({
      where: { id: questionId, examId: attempt.examId },
      include: { answerOptions: { select: { id: true, label: true, isCorrect: true } } },
    });
    if (!question) throw new HttpError(404, "Không tìm thấy câu hỏi.");
    const answer = await prisma.attemptAnswer.findUnique({
      where: { attemptId_questionId: { attemptId: id, questionId } },
    });
    if (!answer) throw new HttpError(403, "Hãy trả lời câu hỏi trước khi xem đáp án.");
    const value = answer.value;
    const completed = question.type === "TRUE_FALSE_SET"
      ? Boolean(value && typeof value === "object" && !Array.isArray(value) && question.answerOptions.every((option) => typeof (value as Record<string, unknown>)[option.id] === "boolean"))
      : typeof value === "string" ? value.trim().length > 0 : value !== null;
    if (!completed) throw new HttpError(403, "Hãy hoàn thành câu trả lời trước.");
    return jsonOk({
      correctOptions: question.answerOptions.filter((option) => option.isCorrect).map((option) => ({ id: option.id, label: option.label })),
      correctText: question.correctText,
      explanation: question.explanation,
    });
  } catch (error) { return handleRouteError(error); }
}
