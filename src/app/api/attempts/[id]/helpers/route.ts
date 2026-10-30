import { z } from "zod";
import { lockAttempt, isAttemptExpired } from "@/lib/attempt-lock";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const helperSchema = z.object({
  itemId: z.string().min(1),
  questionId: z.string().optional(),
});

function getMetadata(metadata: unknown) {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) ? metadata as Record<string, unknown> : {};
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = helperSchema.parse(await readJson<unknown>(request));

    const result = await prisma.$transaction(async (tx) => {
    const attempt = await lockAttempt(tx, id, user.id);
    const exam = await tx.exam.findUniqueOrThrow({ where: { id: attempt.examId }, select: { durationMinutes: true } });
    if (attempt.status !== "IN_PROGRESS" || isAttemptExpired(attempt, exam.durationMinutes)) throw new HttpError(409, "Bài thi đã hết hạn hoặc đã nộp.");
    /* previously: const attempt = await prisma.attempt.findFirst({
      where: { id, userId: user.id, status: "IN_PROGRESS" },
      select: { id: true, examId: true },
    });
    */

    const purchase = await tx.storePurchase.findFirst({
      where: {
        userId: user.id,
        itemId: payload.itemId,
        item: { category: "HELP", isConsumable: true, isActive: true },
      },
      include: { item: true },
      orderBy: { createdAt: "asc" },
    });
    if (!purchase) throw new HttpError(403, "Bạn chưa có vật phẩm trợ giúp này.");

    const metadata = getMetadata(purchase.item.metadata);
    const kind = typeof metadata.kind === "string" ? metadata.kind : "";
    const result: Record<string, unknown> = {
      itemId: purchase.item.id,
      itemName: purchase.item.name,
      kind,
      message: `Đã dùng ${purchase.item.name}.`,
    };

    if (kind === "extraTime") {
      const minutes = Number(metadata.minutes ?? 5);
      result.seconds = Math.max(60, Math.min(20 * 60, minutes * 60));
      await tx.attempt.update({ where: { id }, data: { extraSeconds: { increment: result.seconds as number } } });
    } else if (kind === "fiftyFifty") {
      if (!payload.questionId) throw new HttpError(400, "Cần chọn câu hỏi để dùng 50/50.");
      const question = await tx.question.findFirst({
        where: { id: payload.questionId, examId: attempt.examId, type: "SINGLE_CHOICE" },
        include: { answerOptions: { orderBy: { label: "asc" } } },
      });
      if (!question || question.answerOptions.length < 4) {
        throw new HttpError(400, "50/50 chỉ dùng cho câu trắc nghiệm có 4 đáp án.");
      }
      result.hiddenOptionIds = question.answerOptions.filter((option) => !option.isCorrect).slice(0, 2).map((option) => option.id);
    } else if (kind === "hopeStar") {
      result.hopeStarQuestionId = payload.questionId ?? null;
      result.message = "Đã kích hoạt Ngôi sao hy vọng cho câu hiện tại.";
    } else if (kind === "guardian") {
      result.guardianQuestionId = payload.questionId ?? null;
      result.message = "Đã kích hoạt Bùa hộ mệnh cho câu hiện tại.";
    }

    await tx.storePurchase.delete({ where: { id: purchase.id } });

    return result;
    }, { timeout: 10000, maxWait: 10000 });
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
