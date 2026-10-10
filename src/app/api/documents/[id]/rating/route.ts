import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const ratingSchema = z.object({ rating: z.number().int().min(1).max(5) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = ratingSchema.parse(await readJson<unknown>(request));
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.status !== "APPROVED") throw new HttpError(404, "Không tìm thấy tài liệu.");
    if (document.uploaderId === user.id) throw new HttpError(400, "Bạn không thể tự đánh giá tài liệu của mình.");

    await prisma.documentRating.upsert({
      where: { documentId_userId: { documentId: id, userId: user.id } },
      create: { documentId: id, userId: user.id, rating: payload.rating },
      update: { rating: payload.rating },
    });

    const fiveStarCount = await prisma.documentRating.count({ where: { documentId: id, rating: 5 } });
    if (fiveStarCount >= 10 && !document.qualityRewarded) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.document.findUniqueOrThrow({ where: { id } });
        if (current.qualityRewarded) return;
        await tx.document.update({ where: { id }, data: { qualityRewarded: true } });
        await tx.user.update({ where: { id: current.uploaderId }, data: { exp: { increment: 100 } } });
        await tx.walletTransaction.create({
          data: {
            userId: current.uploaderId,
            amount: 100,
            currency: "EXP",
            reason: "ADMIN_ADJUSTMENT",
            reference: `document-quality-${id}`,
            note: `Tài liệu "${current.title}" đạt 10 đánh giá 5 sao.`,
          },
        });
        await tx.notification.create({
          data: {
            userId: current.uploaderId,
            title: "Tài liệu chất lượng: +100 EXP",
            message: `Tài liệu "${current.title}" đã đạt 10 đánh giá 5 sao.`,
            href: "/documents?mine=1",
          },
        });
      });
    }

    return jsonOk({ rating: payload.rating, fiveStarCount });
  } catch (error) {
    return handleRouteError(error);
  }
}


