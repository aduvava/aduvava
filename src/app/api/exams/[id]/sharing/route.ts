import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const sharingSchema = z.object({
  shareMode: z.enum(["PUBLIC", "PASSWORD", "RESTRICTED"]),
  password: z.string().trim().optional(),
  accessEmails: z.array(z.string().trim().email()).default([]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = sharingSchema.parse(await readJson<unknown>(request));
    const exam = await prisma.exam.findUnique({ where: { id }, select: { id: true, ownerId: true, sharePasswordHash: true } });
    if (!exam) throw new HttpError(404, "Không tìm thấy đề thi.");
    if (exam.ownerId !== user.id) throw new HttpError(403, "Bạn không có quyền chỉnh đề này.");

    const emails = Array.from(new Set(payload.accessEmails.map((email) => email.toLowerCase())));
    const sharePasswordHash = payload.shareMode === "PASSWORD" && payload.password
      ? await bcrypt.hash(payload.password, 12)
      : payload.shareMode === "PASSWORD"
        ? exam.sharePasswordHash
        : null;

    if (payload.shareMode === "PASSWORD" && !sharePasswordHash) {
      throw new HttpError(400, "Vui lòng nhập mật khẩu cho đề thi.");
    }

    await prisma.$transaction([
      prisma.exam.update({
        where: { id: exam.id },
        data: {
          shareMode: payload.shareMode,
          sharePasswordHash,
        },
      }),
      prisma.examAccessGrant.deleteMany({ where: { examId: exam.id, email: { notIn: emails } } }),
      ...emails.map((email) => prisma.examAccessGrant.upsert({
        where: { examId_email: { examId: exam.id, email } },
        update: {},
        create: { examId: exam.id, email },
      })),
    ]);

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
