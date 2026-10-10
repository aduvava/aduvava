import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, requireUser } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const download = new URL(request.url).searchParams.get("download") === "1";
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw new HttpError(404, "Không tìm thấy tài liệu.");
    if (document.status !== "APPROVED" && document.uploaderId !== user.id && user.role !== "ADMIN") {
      throw new HttpError(403, "Tài liệu chưa được công khai.");
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "documents", document.storedName);
    const file = await readFile(filePath);

    if (download && document.status === "APPROVED" && document.uploaderId !== user.id) {
      await prisma.$transaction(async (tx) => {
        const current = await tx.document.findUniqueOrThrow({ where: { id } });
        const existingDownload = await tx.documentDownload.findUnique({
          where: { documentId_userId: { documentId: id, userId: user.id } },
        });
        if (existingDownload) return;

        await tx.documentDownload.create({ data: { documentId: id, userId: user.id } });
        const newDownloads = current.downloads + 1;
        const newMilestone = Math.floor(newDownloads / 10);
        const earnedMilestones = Math.max(0, newMilestone - current.downloadRewardMilestone);
        const bonus = earnedMilestones * 10;

        await tx.document.update({
          where: { id },
          data: {
            downloads: { increment: 1 },
            downloadRewardMilestone: bonus ? newMilestone : current.downloadRewardMilestone,
          },
        });

        if (bonus) {
          await tx.user.update({ where: { id: current.uploaderId }, data: { exp: { increment: bonus } } });
          await tx.walletTransaction.create({
            data: {
              userId: current.uploaderId,
              amount: bonus,
              currency: "EXP",
              reason: "ADMIN_ADJUSTMENT",
              reference: `document-download-${id}-${newMilestone}`,
              note: `Thưởng ${newDownloads} lượt tải cho tài liệu "${current.title}".`,
            },
          });
          await tx.notification.create({
            data: {
              userId: current.uploaderId,
              title: `Bạn nhận được +${bonus} EXP`,
              message: `Tài liệu "${current.title}" đã đạt ${newDownloads} lượt tải.`,
              href: "/documents?mine=1",
            },
          });
        }
      });
    }

    const disposition = download ? "attachment" : "inline";

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Length": String(file.length),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(document.originalName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}


