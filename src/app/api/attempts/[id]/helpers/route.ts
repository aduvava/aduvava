import { z } from "zod";
import { prisma } from "@/lib/db";
import { canAccessExam } from "@/lib/access";
import { helperExtraTimeSeconds, isAttemptExpired, MAX_EXTRA_TIME_SECONDS } from "@/lib/attempt-timing";
import { readLimitedJson } from "@/lib/limited-json";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

const helperSchema = z.object({
  itemId: z.string().min(1).max(128),
  questionId: z.string().max(128).optional(),
}).strict();

function getMetadata(metadata: unknown): Record<string, unknown> {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
    ? metadata as Record<string, unknown> : {};
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = helperSchema.parse(await readLimitedJson(request, 2 * 1024));

    const result = await prisma.$transaction(async (tx) => {
      // Serialize helper activation and answer writes for this attempt.
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Attempt" WHERE "id" = ${id} AND "userId" = ${user.id} FOR UPDATE
      `;
      if (!rows.length) throw new HttpError(404, "Không tìm thấy bài làm đang mở.");

      const attempt = await tx.attempt.findFirst({
        where: { id, userId: user.id, status: "IN_PROGRESS" },
        include: { exam: true },
      });
      if (!attempt) throw new HttpError(404, "Không tìm thấy bài làm đang mở.");
      if (isAttemptExpired(attempt)) throw new HttpError(409, "Hết giờ làm bài, không thể sử dụng trợ giúp.");
      if (!(await canAccessExam(user.id, attempt.exam, tx))) {
        throw new HttpError(403, "Bạn không còn quyền truy cập đề thi này.");
      }

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
        const seconds = helperExtraTimeSeconds(metadata);
        if (attempt.extraTimeSeconds + seconds > MAX_EXTRA_TIME_SECONDS) {
          throw new HttpError(409, "Đề thi đã đạt giới hạn cộng thêm 60 phút.");
        }
        // Persist with the purchased item consumption in one transaction.
        await tx.attempt.update({
          where: { id: attempt.id },
          data: { extraTimeSeconds: { increment: seconds } },
        });
        result.seconds = seconds;
      } else if (kind === "fiftyFifty") {
        if (!payload.questionId) throw new HttpError(400, "Cần chọn câu hỏi để dùng 50/50.");
        const question = await tx.question.findFirst({
          where: { id: payload.questionId, examId: attempt.examId, type: "SINGLE_CHOICE" },
          include: { answerOptions: { orderBy: { label: "asc" } } },
        });
        if (!question || question.answerOptions.length < 4) {
          throw new HttpError(400, "50/50 chỉ dùng cho câu trắc nghiệm có 4 đáp án.");
        }
        result.hiddenOptionIds = question.answerOptions
          .filter((option) => !option.isCorrect).slice(0, 2).map((option) => option.id);
      } else if (kind === "hopeStar") {
        result.hopeStarQuestionId = payload.questionId ?? null;
        result.message = "Đã kích hoạt Ngôi sao hy vọng cho câu hiện tại.";
      } else if (kind === "guardian") {
        result.guardianQuestionId = payload.questionId ?? null;
        result.message = "Đã kích hoạt Bùa hộ mệnh cho câu hiện tại.";
      } else {
        throw new HttpError(400, "Vật phẩm trợ giúp chưa được hỗ trợ.");
      }

      await tx.storePurchase.delete({ where: { id: purchase.id } });
      return result;
    }, { timeout: 10000 });

    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
