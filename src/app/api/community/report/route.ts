import { readLimitedJson } from "@/lib/limited-json";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, requireUser } from "@/lib/api";
import { rateLimitOperation } from "@/lib/security-throttle";
import { communityReportOptions, optionLabel } from "@/lib/compliance-requests";

export const runtime = "nodejs";
const reportSchema = z.object({
  messageId: z.string().min(1).max(120),
  reason: z.enum(["PRIVACY", "BULLYING", "CHILD_SAFETY", "COPYRIGHT", "SPAM", "OTHER"]),
  details: z.string().trim().max(500).default(""),
}).strict();

function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== allowed) throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const session = await requireUser();
    const input = reportSchema.parse(await readLimitedJson(request, 4096));
    const user = await prisma.user.findUnique({
      where: { id: session.id }, select: { id: true, name: true, email: true },
    });
    if (!user) throw new HttpError(401, "Tài khoản không còn tồn tại.");
    const target = await prisma.communityMessage.findUnique({
      where: { id: input.messageId }, select: { id: true },
    });
    if (!target) throw new HttpError(404, "Tin nhắn không còn tồn tại.");
    await rateLimitOperation(prisma, "community-report", user.id, request.headers);

    const prefix = "Mã tin nhắn: " + target.id + "\n";
    const previous = await prisma.leadMessage.findFirst({
      where: { userId: user.id, source: "community-report", status: { in: ["OPEN", "IN_REVIEW"] }, message: { startsWith: prefix } },
      select: { id: true },
    });
    if (previous) {
      return NextResponse.json({ reportId: previous.id, message: "Báo cáo này đã được tiếp nhận." },
        { headers: { "Cache-Control": "private, no-store" } });
    }
    const label = optionLabel(communityReportOptions, input.reason);
    if (!label) throw new HttpError(400, "Lý do báo cáo không hợp lệ.");
    const record = await prisma.leadMessage.create({
      data: {
        name: user.name || "Thành viên Educhi", email: user.email,
        userId: user.id, source: "community-report",
        message: prefix + "Lý do: " + label + "\nChi tiết: " + (input.details || "Không có"),
      },
      select: { id: true },
    });
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length) await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id, title: "Báo cáo cộng đồng",
          message: "Có tin nhắn bị báo cáo cần kiểm tra.", href: "/admin/requests",
        })),
      });
    } catch (error) {
      console.error("Moderation notification failed", error instanceof Error ? error.message : "Unknown error");
    }
    return NextResponse.json({ reportId: record.id, message: "Đã gửi báo cáo cho quản trị viên." },
      { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleRouteError(error); }
}
