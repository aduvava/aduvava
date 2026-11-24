import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, requireAdmin, HttpError, handleRouteError } from "@/lib/api";
import { readLimitedJson } from "@/lib/limited-json";
import { consumeSecurityThrottle } from "@/lib/security-throttle";
import { displayCommunityMember, initialsOfDisplayName } from "@/lib/compliance-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== allowed) throw new HttpError(403, "Invalid request origin");
}

async function history() {
  const rows = (await prisma.communityMessage.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 60,
  })).reverse();
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((row) => row.userId))] } },
    select: { id: true, name: true, role: true },
  });
  const names = new Map(users.map((user) => [user.id, { name: displayCommunityMember(user), role: user.role }]));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return rows.map((row) => ({
    id: row.id,
    name: names.get(row.userId)?.name || "Thành viên Educhi",
    initials: initialsOfDisplayName(names.get(row.userId)?.name || "ED"),
    text: row.content,
    time: row.createdAt.toISOString(),
    color: "bg-orange-100 text-orange-600",
    replyTo: row.replyToId && byId.has(row.replyToId) ? {
      name: names.get(byId.get(row.replyToId)!.userId)?.name || "Thành viên Educhi",
      text: byId.get(row.replyToId)!.content,
    } : undefined,

  }));
}

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ messages: await history() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    const body = await readLimitedJson(request, 4 * 1024) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Dữ liệu không hợp lệ.");
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 500) throw new HttpError(400, "Tin nhắn phải có từ 1 đến 500 ký tự.");
    // Atomic per-account throttle across all server instances.
    await consumeSecurityThrottle(prisma, "community-send", user.id, { limit: 1, windowSeconds: 3 });
    await consumeSecurityThrottle(prisma, "community-daily", user.id, { limit: 300, windowSeconds: 86400 });
    const replyToId = typeof body.replyToId === "string" ? body.replyToId : null;
    const reply = replyToId ? await prisma.communityMessage.findUnique({ where: { id: replyToId }, select: { id: true } }) : null;
    await prisma.communityMessage.create({ data: { userId: user.id, content: message, replyToId: reply?.id || null } });
    return NextResponse.json({ messages: await history() }, { status: 201 });
  } catch (error) { return handleRouteError(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();

    const body = await readLimitedJson(request, 4 * 1024) as Record<string, unknown>;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Dữ liệu không hợp lệ.");
    if (typeof body.id !== "string") throw new HttpError(400, "Thiếu mã tin nhắn.");
    await prisma.communityMessage.delete({ where: { id: body.id } });
    return NextResponse.json({ messages: await history() });
  } catch (error) { return handleRouteError(error); }
}
