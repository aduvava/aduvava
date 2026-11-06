import type { PrismaClient } from "@prisma/client";
import { HttpError } from "@/lib/api";

export type VipGrantRequest = {
  requestId: string;
  adminId: string;
  userId: string;
  planId: string;
  days: number;
  note: string;
};

export function addVipDays(start: Date, days: number): Date {
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new HttpError(400, "Số ngày VIP phải từ 1 đến 365.");
  }
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

function sameGrant(existing: VipGrantRequest, next: VipGrantRequest) {
  return existing.adminId === next.adminId &&
    existing.userId === next.userId &&
    existing.planId === next.planId &&
    existing.days === next.days &&
    existing.note === next.note;
}

// Administrative gifts are not bank payments. Only add an audited
// subscription; do not create a PAID transaction or fake SePay receipt.
export async function grantAdminVip(db: PrismaClient, input: VipGrantRequest) {
  for (let retry = 0; retry < 4; retry += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const existing = await tx.adminVipGrant.findUnique({
          where: { requestId: input.requestId },
        });
        if (existing) {
          if (!sameGrant(existing, input)) throw new HttpError(409, "Mã yêu cầu VIP đã được sử dụng cho một giao dịch khác.");
          return { activated: false, subscriptionId: existing.subscriptionId, endsAt: existing.endsAt };
        }

        const [user, plan] = await Promise.all([
          tx.user.findUnique({ where: { id: input.userId }, select: { id: true, email: true } }),
          tx.plan.findUnique({ where: { id: input.planId }, select: { id: true, name: true, isActive: true } }),
        ]);
        if (!user) throw new HttpError(404, "Không tìm thấy tài khoản để cấp VIP.");
        if (!plan?.isActive) throw new HttpError(404, "Gói VIP không tồn tại hoặc đã ngừng bán.");

        const now = new Date();
        const previous = await tx.subscription.findFirst({
          where: { userId: user.id, status: "ACTIVE", endsAt: { gt: now } },
          orderBy: { endsAt: "desc" },
          select: { endsAt: true },
        });
        const startsAt = previous?.endsAt && previous.endsAt > now ? previous.endsAt : now;
        const endsAt = addVipDays(startsAt, input.days);

        const subscription = await tx.subscription.create({
          data: {
            userId: user.id, planId: plan.id, status: "ACTIVE",
            startsAt, endsAt,
          },
        });
        await tx.adminVipGrant.create({
          data: {
            requestId: input.requestId, adminId: input.adminId,
            userId: user.id, planId: plan.id, days: input.days,
            note: input.note, subscriptionId: subscription.id,
            startsAt, endsAt,
          },
        });
        await tx.notification.create({
          data: {
            userId: user.id, href: "/vip",
            title: "Educhi đã tặng bạn VIP",
            message: `Bạn được cấp ${input.days} ngày VIP (${plan.name}). Hạn sử dụng mới: ${endsAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.`,
          },
        });
        return { activated: true, subscriptionId: subscription.id, endsAt };
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2034" && retry < 3) continue;
      if (code === "P2002") {
        // A concurrent retry might have committed the same requestId.
        const existing = await db.adminVipGrant.findUnique({ where: { requestId: input.requestId } });
        if (existing && sameGrant(existing, input)) {
          return { activated: false, subscriptionId: existing.subscriptionId, endsAt: existing.endsAt };
        }
        throw new HttpError(409, "Mã yêu cầu đã dùng hoặc dữ liệu bị trùng. Không cấp VIP thêm.");
      }
      throw error;
    }
  }
  throw new HttpError(503, "Hệ thống đang bận. Thử lại với cùng mã yêu cầu.");
}
