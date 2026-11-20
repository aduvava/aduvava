import { readLimitedJson } from "@/lib/limited-json";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, requireAdmin } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sources = ["privacy-request", "community-report", "service-page", "website"] as const;
const updateSchema = z.object({
  id: z.string().min(1).max(120),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"]),
  adminNote: z.string().trim().max(1500),
}).strict();
const removeSchema = z.object({
  id: z.string().min(1).max(120),
  messageId: z.string().min(1).max(120),
}).strict();

function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== allowed) throw new HttpError(403, "Invalid request origin");
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const source = new URL(request.url).searchParams.get("source");
    const where = source && sources.includes(source as typeof sources[number]) ? { source } : {};
    const [items, pending] = await Promise.all([
      prisma.leadMessage.findMany({
        where, orderBy: { createdAt: "desc" }, take: 100,
        select: { id: true, source: true, name: true, email: true, phone: true,
          message: true, status: true, adminNote: true, userId: true,
          createdAt: true, processedAt: true },
      }),
      prisma.leadMessage.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    ]);
    return NextResponse.json({ items, pending }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleRouteError(error); }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    const data = updateSchema.parse(await readLimitedJson(request, 8192));
    const result = await prisma.leadMessage.updateMany({
      where: { id: data.id },
      data: {
        status: data.status, adminNote: data.adminNote || null,
        processedAt: ["RESOLVED", "DISMISSED"].includes(data.status) ? new Date() : null,
      },
    });
    if (!result.count) throw new HttpError(404, "Không tìm thấy yêu cầu.");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleRouteError(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin();
    const data = removeSchema.parse(await readLimitedJson(request, 8192));
    const report = await prisma.leadMessage.findFirst({
      where: { id: data.id, source: "community-report" }, select: { message: true },
    });
    if (!report || !report.message.startsWith("Mã tin nhắn: " + data.messageId + "\n")) {
      throw new HttpError(400, "Yêu cầu không khớp tin nhắn bị báo cáo.");
    }
    // Explicit moderator action; do not delete automatically on user report.
    const deleted = await prisma.$transaction(async (tx) => {
      const removed = await tx.communityMessage.deleteMany({ where: { id: data.messageId } });
      await tx.leadMessage.update({
        where: { id: data.id },
        data: {
          status: "RESOLVED", processedAt: new Date(),
          adminNote: "Admin " + admin.id + ": đã gỡ tin nhắn " + data.messageId +
            (removed.count ? "" : " (không còn tồn tại)"),
        },
      });
      return removed.count;
    });
    return NextResponse.json({ removed: deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleRouteError(error); }
}
