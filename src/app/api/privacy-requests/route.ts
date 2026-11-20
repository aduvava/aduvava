import { readLimitedJson } from "@/lib/limited-json";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, requireUser } from "@/lib/api";
import { rateLimitOperation } from "@/lib/security-throttle";
import { optionLabel, privacyRequestOptions } from "@/lib/compliance-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  type: z.enum(["ACCESS", "CORRECTION", "DELETION", "ACCOUNT_DELETION", "RESTRICT", "WITHDRAW_CONSENT", "CHILD_SAFETY"]),
  details: z.string().trim().max(1200).default(""),
}).strict();

function verifyOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== allowed) throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
}

async function currentAccount() {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.id }, select: { id: true, name: true, email: true },
  });
  if (!user) throw new HttpError(401, "Tài khoản không còn tồn tại.");
  return user;
}

export async function GET() {
  try {
    const user = await currentAccount();
    const items = await prisma.leadMessage.findMany({
      where: { userId: user.id, source: "privacy-request" },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, message: true, status: true, createdAt: true, processedAt: true },
    });
    return NextResponse.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: Request) {
  try {
    verifyOrigin(request);
    const user = await currentAccount();
    const input = requestSchema.parse(await readLimitedJson(request, 8192));
    const label = optionLabel(privacyRequestOptions, input.type);
    if (!label) throw new HttpError(400, "Loại yêu cầu không hợp lệ.");
    await rateLimitOperation(prisma, "privacy-request", user.id, request.headers);
    const caseItem = await prisma.leadMessage.create({
      data: {
        userId: user.id,
        name: user.name || "Thành viên Educhi",
        email: user.email,
        source: "privacy-request",
        message: "Loại yêu cầu: " + label + "\nThông tin bổ sung: " + (input.details || "Không có"),
      },
      select: { id: true, status: true, createdAt: true },
    });
    try {
      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      if (admins.length) await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Yêu cầu quyền dữ liệu mới",
          message: "Có yêu cầu mới cần xác minh và xử lý.",
          href: "/admin/requests",
        })),
      });
    } catch (error) {
      console.error("Compliance notification failed", error instanceof Error ? error.message : "Unknown error");
    }
    return NextResponse.json({
      request: caseItem,
      message: "Yêu cầu đã được ghi nhận. Đây chưa phải là xác nhận xóa hay sửa dữ liệu.",
    }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return handleRouteError(error); }
}
