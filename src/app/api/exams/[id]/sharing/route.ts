import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readLimitedJson } from "@/lib/limited-json";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

const sharingSchema = z.object({
  shareMode: z.enum(["PUBLIC", "PASSWORD", "RESTRICTED"]),
  password: z.string().trim().min(8).max(128).optional(),
  accessEmails: z.array(z.string().trim().email().max(254)).max(100).default([]),
}).strict();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = sharingSchema.parse(await readLimitedJson(request, 32 * 1024));
    if (payload.password && Buffer.byteLength(payload.password, "utf8") > 72) {
      throw new HttpError(400, "Mật khẩu đề thi phải có tối đa 72 byte UTF-8.");
    }

    // Hash outside the transaction; hold the row lock for as little time as possible.
    const newHash = payload.shareMode === "PASSWORD" && payload.password
      ? await bcrypt.hash(payload.password, 12) : null;
    const emails = payload.shareMode === "PUBLIC"
      ? []
      : Array.from(new Set(payload.accessEmails.map((email) => email.toLowerCase())));

    await prisma.$transaction(async (tx) => {
      const exam = await tx.exam.findUnique({
        where: { id },
        select: { id: true, ownerId: true, sharePasswordHash: true },
      });
      if (!exam) throw new HttpError(404, "Không tìm thấy đề thi.");
      if (exam.ownerId !== user.id) throw new HttpError(403, "Bạn không có quyền chỉnh đề này.");

      const sharePasswordHash = payload.shareMode === "PASSWORD"
        ? newHash ?? exam.sharePasswordHash
        : null;
      if (payload.shareMode === "PASSWORD" && !sharePasswordHash) {
        throw new HttpError(400, "Vui lòng nhập mật khẩu cho đề thi.");
      }

      // Updating Exam acquires a PostgreSQL row lock. Password access requests
      // take the same lock, so they cannot grant access using a rotated password
      // after this revocation has committed.
      await tx.exam.update({
        where: { id: exam.id },
        data: { shareMode: payload.shareMode, sharePasswordHash },
      });

      // Revoke ALL historical grants, including userId-only and password-derived
      // grants. Recreate only emails explicitly listed by the owner now.
      await tx.examAccessGrant.deleteMany({ where: { examId: exam.id } });
      if (emails.length) {
        await tx.examAccessGrant.createMany({
          data: emails.map((email) => ({ examId: exam.id, email })),
          skipDuplicates: true,
        });
      }
    }, { timeout: 10000 });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
