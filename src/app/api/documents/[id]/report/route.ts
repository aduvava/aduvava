import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, readJson, requireUser } from "@/lib/api";

const reportSchema = z.object({
  reason: z.enum(["FILE_ERROR", "WRONG_CONTENT", "SPAM", "COPYRIGHT"]),
  details: z.string().trim().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const payload = reportSchema.parse(await readJson<unknown>(request));
    const document = await prisma.document.findFirst({ where: { id, status: "APPROVED" } });
    if (!document) throw new HttpError(404, "Không tìm thấy tài liệu.");

    const report = await prisma.documentReport.upsert({
      where: { documentId_userId: { documentId: id, userId: user.id } },
      create: { documentId: id, userId: user.id, reason: payload.reason, details: payload.details },
      update: { reason: payload.reason, details: payload.details, status: "OPEN" },
      select: { id: true },
    });
    return jsonOk({ report, message: "Cảm ơn bạn đã báo cáo. Admin sẽ kiểm tra tài liệu." }, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
