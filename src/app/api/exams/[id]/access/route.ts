import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimitOperation } from "@/lib/security-throttle";
import { readLimitedJson } from "@/lib/limited-json";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

const accessSchema = z.object({
  password: z.string().min(1).max(128),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await rateLimitOperation(prisma, "exam-password", `${user.id}:${id}`, request.headers);
    const payload = accessSchema.parse(await readLimitedJson(request, 4 * 1024));
    if (Buffer.byteLength(payload.password, "utf8") > 72) {
      throw new HttpError(400, "Mật khẩu không hợp lệ.");
    }

    await prisma.$transaction(async (tx) => {
      // Serialize password verification and grant creation with sharing updates.
      // A password rotated by the owner cannot be accepted after revocation.
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Exam" WHERE "id" = ${id} FOR UPDATE
      `;
      if (!rows.length) throw new HttpError(404, "Không tìm thấy đề thi.");

      const exam = await tx.exam.findUnique({
        where: { id },
        select: { id: true, ownerId: true, shareMode: true, sharePasswordHash: true },
      });
      if (!exam) throw new HttpError(404, "Không tìm thấy đề thi.");
      if (exam.ownerId === user.id || exam.shareMode === "PUBLIC") return;
      if (exam.shareMode !== "PASSWORD" || !exam.sharePasswordHash) {
        throw new HttpError(403, "Đề thi không cho phép truy cập bằng mật khẩu.");
      }
      if (!(await bcrypt.compare(payload.password, exam.sharePasswordHash))) {
        throw new HttpError(403, "Mật khẩu không đúng.");
      }

      // Password knowledge grants access to this account only. Never claim
      // or overwrite someone else's email invitation with an unverified email.
      const existing = await tx.examAccessGrant.findUnique({
        where: { examId_userId: { examId: exam.id, userId: user.id } },
      });
      if (!existing) {
        await tx.examAccessGrant.create({ data: { examId: exam.id, userId: user.id } });
      }
    }, { timeout: 15000 });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
