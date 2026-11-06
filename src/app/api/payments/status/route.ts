import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleRouteError, HttpError, jsonOk, requireUser } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client-facing status is read-only: it never changes PENDING to PAID or
// creates VIP. Only a verified SePay webhook (or an explicit admin action)
// may commit the subscription via the atomic payment transition.
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const id = z.string().cuid().safeParse(new URL(request.url).searchParams.get("paymentId"));
    if (!id.success) throw new HttpError(400, "Mã thanh toán không hợp lệ.");
    const payment = await prisma.payment.findFirst({
      where: { id: id.data, userId: user.id },
      select: { status: true, updatedAt: true },
    });
    if (!payment) throw new HttpError(404, "Không tìm thấy giao dịch của bạn.");
    const activeVip = payment.status === "PAID"
      ? await prisma.subscription.findFirst({
          where: { userId: user.id, status: "ACTIVE", endsAt: { gt: new Date() } },
          select: { endsAt: true },
          orderBy: { endsAt: "desc" },
        })
      : null;
    return jsonOk({
      status: payment.status,
      vipActivated: Boolean(activeVip),
      vipEndsAt: activeVip?.endsAt ?? null,
    });
  } catch (error) { return handleRouteError(error); }
}
