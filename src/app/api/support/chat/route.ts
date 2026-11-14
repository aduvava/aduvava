import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError, handleRouteError, requireUser } from "@/lib/api";
import { consumeSecurityThrottle, TooManyRequestsError } from "@/lib/security-throttle";
import {
  answerSupportWithAi, releaseSupportAiBudget, reserveSupportAiBudget,
  settleSupportAiBudget, shouldEscalateSupport, supportAiConfig,
} from "@/lib/support-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("new") }),
  z.object({ action: z.literal("escalate"), conversationId: z.string().min(1).max(100) }),
  z.object({
    action: z.literal("send"),
    conversationId: z.string().min(1).max(100).optional(),
    message: z.string().trim().min(1).max(500),
  }),
]);

function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : new URL(request.url).origin;
  if (!origin || origin !== allowed) throw new HttpError(403, "Invalid request origin");
}

async function findUserThread(userId: string, id?: string) {
  if (id) {
    const thread = await prisma.supportConversation.findFirst({ where: { id, userId } });
    if (!thread) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện.");
    return thread;
  }
  return prisma.supportConversation.findFirst({
    where: { userId }, orderBy: { updatedAt: "desc" },
  });
}

async function returnHistory(userId: string, id?: string) {
  const [threads, selected] = await Promise.all([
    prisma.supportConversation.findMany({
      where: { userId }, orderBy: { updatedAt: "desc" },
      take: 15, select: { id: true, status: true, updatedAt: true },
    }),
    findUserThread(userId, id),
  ]);
  const rows = selected ? await prisma.supportMessage.findMany({
    where: { conversationId: selected.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 80,
    select: { id: true, sender: true, content: true, createdAt: true },
  }) : [];
  return {
    conversation: selected ? { id: selected.id, status: selected.status } : null,
    conversations: threads,
    messages: rows.reverse(),
    aiEnabled: supportAiConfig().enabled,
  };
}

async function addSystemNotice(conversationId: string, text: string) {
  await prisma.$transaction([
    prisma.supportConversation.update({
      where: { id: conversationId }, data: { status: "WAITING_ADMIN" },
    }),
    prisma.supportMessage.create({
      data: { conversationId, sender: "SYSTEM", content: text },
    }),
  ]);
  // Notify Admins via their existing Educhi notification bell as well as the inbox.
  // Chat escalation remains successful even when notification delivery fails.
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" }, select: { id: true },
    });
    if (admins.length) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: "Học sinh cần hỗ trợ",
          message: "Có hội thoại mới đang chờ Admin xử lý.",
          href: "/admin/support",
        })),
      });
    }
  } catch (error) {
    console.error("Cannot create Admin support notification", error instanceof Error ? error.message : "Unknown error");
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const id = url.searchParams.get("conversationId") ?? undefined;
    return NextResponse.json(await returnHistory(user.id, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) { return handleRouteError(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await requireUser();
    if (Number(request.headers.get("content-length")) > 4096) throw new HttpError(413, "Tin nhắn quá dài.");
    const raw = await request.text();
    if (raw.length > 4096) throw new HttpError(413, "Tin nhắn quá dài.");
    const body = payloadSchema.parse(JSON.parse(raw));

    if (body.action === "new") {
      await consumeSecurityThrottle(prisma, "support-new", user.id, { limit: 15, windowSeconds: 86400 });
      const thread = await prisma.supportConversation.create({ data: { userId: user.id } });
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "escalate") {
      const thread = await findUserThread(user.id, body.conversationId);
      if (!thread) throw new HttpError(404, "Không tìm thấy cuộc trò chuyện.");
      if (thread.status !== "WAITING_ADMIN") {
        await addSystemNotice(thread.id, "Đã chuyển cuộc trò chuyện đến Admin Educhi. Vui lòng chờ phản hồi tại đây.");
      }
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }

    await consumeSecurityThrottle(prisma, "support-send", user.id, { limit: 100, windowSeconds: 86400 });
    let thread = await findUserThread(user.id, body.conversationId);
    if (!thread || thread.status === "RESOLVED") {
      await consumeSecurityThrottle(prisma, "support-new", user.id, { limit: 15, windowSeconds: 86400 });
      thread = await prisma.supportConversation.create({ data: { userId: user.id } });
    }

    await prisma.$transaction([
      prisma.supportMessage.create({ data: {
        conversationId: thread.id, sender: "USER", content: body.message,
      } }),
      prisma.supportConversation.update({ where: { id: thread.id }, data: { updatedAt: new Date() } }),
    ]);
    if (thread.status === "WAITING_ADMIN") {
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }
    if (shouldEscalateSupport(body.message)) {
      await addSystemNotice(thread.id, "Vấn đề này cần nhân viên kiểm tra. Đã chuyển cuộc trò chuyện đến Admin Educhi.");
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }
    if (!supportAiConfig().enabled) {
      await addSystemNotice(thread.id, "AI chưa được bật. Câu hỏi đã được chuyển cho Admin Educhi.");
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }
    try {
      await consumeSecurityThrottle(prisma, "support-ai", user.id, {
        limit: supportAiConfig().dailyLimit, windowSeconds: 86400,
      });
    } catch (error) {
      if (!(error instanceof TooManyRequestsError)) throw error;
      await addSystemNotice(thread.id, "Bạn đã dùng hết lượt AI hôm nay. Cuộc trò chuyện đã được chuyển cho Admin.");
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }

    const reservation = await reserveSupportAiBudget();
    if (!reservation) {
      await addSystemNotice(thread.id, "Hạn mức chi phí AI tháng này đã hết. Câu hỏi được chuyển cho Admin.");
      return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
    }
    let settled = false;
    try {
      const history = await prisma.supportMessage.findMany({
        where: { conversationId: thread.id, sender: { in: ["USER", "AI", "ADMIN"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10,
        select: { sender: true, content: true },
      });
      const reply = await answerSupportWithAi(history.reverse());
      await settleSupportAiBudget(reservation, reply.costMicroUsd);
      settled = true;
      await prisma.$transaction([
        prisma.supportMessage.create({ data: {
          conversationId: thread.id, sender: "AI", content: reply.text,
          model: reply.model, inputTokens: reply.inputTokens,
          outputTokens: reply.outputTokens, costMicroUsd: reply.costMicroUsd,
        } }),
        prisma.supportConversation.update({ where: { id: thread.id }, data: { updatedAt: new Date() } }),
      ]);
    } catch (error) {
      if (!settled) await releaseSupportAiBudget(reservation);
      console.error("Educhi AI support unavailable", error instanceof Error ? error.message : "Unexpected error");
      await addSystemNotice(thread.id, "AI tạm thời không xử lý được câu hỏi. Đã chuyển cuộc trò chuyện đến Admin.");
    }
    return NextResponse.json(await returnHistory(user.id, thread.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
    return handleRouteError(error);
  }
}
