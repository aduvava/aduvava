import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireAdmin } from "@/lib/api";

const moderationSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  reason: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payload = moderationSchema.parse(await readJson<unknown>(request));
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw new HttpError(404, "Không tìm thấy tài liệu.");

    if (payload.action === "REJECT") {
      const rejected = await prisma.document.update({
        where: { id },
        data: { status: "REJECTED", rejectionReason: payload.reason || "Tài liệu chưa đáp ứng tiêu chuẩn cộng đồng." },
      });
      await prisma.notification.create({
        data: {
          userId: rejected.uploaderId,
          title: "Tài liệu cần chỉnh sửa",
          message: `Tài liệu "${rejected.title}" chưa được duyệt: ${rejected.rejectionReason}`,
          href: "/documents?mine=1",
        },
      });
      return jsonOk({ document: rejected });
    }

    const approved = await prisma.$transaction(async (tx) => {
      const current = await tx.document.findUniqueOrThrow({ where: { id } });
      const reward = current.approvalRewarded ? 0 : 50;
      const updated = await tx.document.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedAt: new Date(),
          rejectionReason: null,
          approvalRewarded: true,
        },
      });

      if (reward) {
        await tx.user.update({ where: { id: current.uploaderId }, data: { exp: { increment: reward } } });
        await tx.walletTransaction.create({
          data: {
            userId: current.uploaderId,
            amount: reward,
            currency: "EXP",
            reason: "ADMIN_ADJUSTMENT",
            reference: `document-approved-${id}`,
            note: `Tài liệu "${current.title}" được phê duyệt.`,
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: current.uploaderId,
          title: reward ? "Tài liệu đã duyệt: +50 EXP" : "Tài liệu đã được phê duyệt",
          message: `Tài liệu "${current.title}" đã được công khai trên kho tài liệu.`,
          href: "/documents?mine=1",
        },
      });
      return updated;
    });

    return jsonOk({ document: approved });
  } catch (error) {
    return handleRouteError(error);
  }
}
