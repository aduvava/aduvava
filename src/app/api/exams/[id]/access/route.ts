import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const accessSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = accessSchema.parse(await readJson<unknown>(request));
    const exam = await prisma.exam.findUnique({ where: { id }, select: { id: true, ownerId: true, shareMode: true, sharePasswordHash: true } });
    if (!exam) throw new HttpError(404, "Không tìm thấy đề thi.");
    if (exam.ownerId === user.id || exam.shareMode === "PUBLIC") return jsonOk({ ok: true });
    if (exam.shareMode !== "PASSWORD" || !exam.sharePasswordHash) throw new HttpError(403, "Đề thi không cho phép truy cập bằng mật khẩu.");

    const valid = await bcrypt.compare(payload.password, exam.sharePasswordHash);
    if (!valid) throw new HttpError(403, "Mật khẩu không đúng.");

    const email = user.email?.toLowerCase() ?? null;
    const existing = await prisma.examAccessGrant.findFirst({
      where: {
        examId: exam.id,
        OR: [
          { userId: user.id },
          ...(email ? [{ email }] : []),
        ],
      },
    });

    if (existing) {
      await prisma.examAccessGrant.update({ where: { id: existing.id }, data: { userId: user.id, email } });
    } else {
      await prisma.examAccessGrant.create({ data: { examId: exam.id, userId: user.id, email } });
    }

    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
