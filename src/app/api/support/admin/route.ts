import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, requireAdmin } from "@/lib/api";
import { supportAiConfig, supportCurrentMonth } from "@/lib/support-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reply"),
    conversationId: z.string().min(1).max(100),
    message: z.string().trim().min(1).max(3000),
  }),
  z.object({
    action: z.literal("resolve"),
    conversationId: z.string().min(1).max(100),
  }),
]);

function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== allowed) throw new HttpError(403, "Invalid request origin");
}

async function getAdminInbox(selectedId?: string) {
  const month = supportCurrentMonth();
  const [recentConversations, pendingConversations, budget, pending] = await Promise.all([
    prisma.supportConversation.findMany({
      orderBy: { updatedAt: "desc" }, take: 75,
      select: {
        id: true, status: true, updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1,
          select: { content: true, sender: true } },
      },
    }),
    prisma.supportConversation.findMany({
      where: { status: "WAITING_ADMIN" },
      orderBy: { updatedAt: "asc" }, take: 75,
      select: {
        id: true, status: true, updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1,
          select: { content: true, sender: true } },
      },
    }),
    prisma.supportAiBudget.findUnique({
      where: { month }, select: { spentMicroUsd: true, heldMicroUsd: true },
    }),
    prisma.supportConversation.count({ where: { status: "WAITING_ADMIN" } }),
  ]);

  const conversations = [...new Map([...pendingConversations, ...recentConversations].map((item) => [item.id, item])).values()];
  const selected = selectedId ? await prisma.supportConversation.findUnique({
    where: { id: selectedId }, select: { id: true, status: true },
  }) : conversations.find((thread) => thread.status === "WAITING_ADMIN") ?? conversations[0] ?? null;
  if (selectedId && !selected) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện.");
  const messages = selected ? await prisma.supportMessage.findMany({
    where: { conversationId: selected.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    select: { id: true, sender: true, content: true, createdAt: true, costMicroUsd: true },
  }) : [];

  const config = supportAiConfig();
  return {
    conversations, selected, messages: messages.reverse(), pending,
    budget: { month, enabled: config.enabled, model: config.model,
      spentUsd: (budget?.spentMicroUsd ?? 0) / 1_000_000,
      heldUsd: (budget?.heldMicroUsd ?? 0) / 1_000_000,
      capUsd: config.capUsd, dailyLimit: config.dailyLimit },
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const selectedId = new URL(request.url).searchParams.get("conversationId") ?? undefined;
    return NextResponse.json(await getAdminInbox(selectedId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    await requireAdmin();
    if (Number(request.headers.get("content-length")) > 8192) throw new HttpError(413, "Nội dung quá dài.");
    const raw = await request.text();
    if (raw.length > 8192) throw new HttpError(413, "Nội dung quá dài.");
    const body = payloadSchema.parse(JSON.parse(raw));
    const thread = await prisma.supportConversation.findUnique({
      where: { id: body.conversationId }, select: { id: true, status: true },
    });
    if (!thread) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện.");
    if (body.action === "reply") {
      await prisma.$transaction([
        prisma.supportMessage.create({ data: {
          conversationId: thread.id, sender: "ADMIN", content: body.message,
        } }),
        prisma.supportConversation.update({
          where: { id: thread.id }, data: { status: "WAITING_ADMIN" },
        }),
      ]);
    } else {
      await prisma.supportConversation.update({
        where: { id: thread.id }, data: { status: "RESOLVED" },
      });
    }
    return NextResponse.json(await getAdminInbox(thread.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
    return handleRouteError(error);
  }
}
