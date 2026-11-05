"use strict";

// A single transaction implements all PAID -> VIP activations from both admin
// interfaces. Never mark a payment as PAID before its subscription is committed.
const VALID_STATUSES = new Set(["PENDING", "PAID", "FAILED"]);

class PaymentTransitionError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "PaymentTransitionError";
    this.status = status;
  }
}

function planMonths(interval) {
  if (interval === "QUARTER") return 3;
  if (interval === "YEAR") return 12;
  if (interval === "MONTH") return 1;
  throw new Error("Unknown subscription interval");
}

function extendUtcMonths(date, months) {
  const end = new Date(date);
  const originalDay = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const finalDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(originalDay, finalDay));
  return end;
}

function asMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/**
 * Treat payments as immutable after settlement. A completed payment has exactly
 * one linked subscription via metadata.vipSubscriptionId; the link, status,
 * subscription and notification are written atomically.
 *
 * Prisma TransactionIsolationLevel.Serializable on Postgres prevents two
 * concurrent confirmations from granting VIP twice. Serialization conflicts
 * are retried, but other errors are rethrown without changing payment state.
 */
async function transitionManualPayment(db, paymentId, nextStatus, sepayEventId = /** @type {string | null} */ (null)) {
  if (!VALID_STATUSES.has(nextStatus)) throw new PaymentTransitionError(400, "Invalid payment status");
  if (sepayEventId !== null && (!/^[1-9][0-9]{0,15}$/.test(sepayEventId) || nextStatus !== "PAID")) {
    throw new PaymentTransitionError(400, "Invalid SePay event ID or payment transition");
  }

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        const current = await tx.payment.findUnique({
          where: { id: paymentId },
          include: { plan: true },
        });
        if (!current) throw new PaymentTransitionError(404, "Payment not found");
        if (current.provider !== "manual-bank-transfer") {
          throw new PaymentTransitionError(409, "Only manual bank transfer payments can be confirmed here");
        }

        const metadata = asMetadata(current.metadata);
        if (sepayEventId !== null) {
          // A webhook receipt is written inside the same SERIALIZABLE
          // transaction as the activation, never before or after it.
          const existingReceipt = await tx.sePayReceipt.findUnique({
            where: { eventId: sepayEventId },
          });
          if (existingReceipt && existingReceipt.paymentId !== paymentId) {
            throw new PaymentTransitionError(409, "SePay transaction already belongs to another payment");
          }
          if (existingReceipt && current.status !== "PAID") {
            throw new PaymentTransitionError(409, "SePay event was processed but payment is inconsistent");
          }
        }
        if (current.status === "PAID") {
          if (nextStatus !== "PAID") {
            throw new PaymentTransitionError(409, "Settled payments cannot be reset or reversed");
          }
          // Legacy PAID payments were not fully atomic and lack a stable
          // subscription link. Do not grant another VIP without reconciliation.
          if (typeof metadata.vipSubscriptionId !== "string") {
            throw new PaymentTransitionError(409, "Legacy paid payment requires manual VIP reconciliation");
          }
          const linked = await tx.subscription.findUnique({
            where: { id: metadata.vipSubscriptionId },
            select: { id: true, userId: true, planId: true },
          });
          if (!linked || linked.userId !== current.userId || linked.planId !== current.planId) {
            throw new PaymentTransitionError(409, "Paid payment has no matching VIP subscription");
          }
          return { payment: current, activated: false, subscriptionId: linked.id };
        }

        if (metadata.adminVipActivatedAt || metadata.sepayVipActivatedAt || metadata.vipSubscriptionId) {
          throw new PaymentTransitionError(409, "Payment already has an activation marker; reconcile manually");
        }

        if (nextStatus !== "PAID") {
          const payment = current.status === nextStatus ? current : await tx.payment.update({
            where: { id: paymentId },
            data: { status: nextStatus },
          });
          return { payment, activated: false, subscriptionId: null };
        }

        // Only an administrator who has verified bank funds may call this path.
        const now = new Date();
        const previous = await tx.subscription.findFirst({
          where: { userId: current.userId, status: "ACTIVE", endsAt: { gt: now } },
          orderBy: { endsAt: "desc" },
        });
        const startsAt = previous?.endsAt && previous.endsAt > now ? previous.endsAt : now;
        const endsAt = extendUtcMonths(startsAt, planMonths(current.plan.interval));
        const subscription = await tx.subscription.create({
          data: {
            userId: current.userId,
            planId: current.planId,
            status: "ACTIVE",
            startsAt,
            endsAt,
          },
        });
        const payment = await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: "PAID",
            metadata: {
              ...metadata,
              ...(sepayEventId
                ? { sepayVipActivatedAt: now.toISOString(), sepayEventId }
                : { adminVipActivatedAt: now.toISOString() }),
              vipSubscriptionId: subscription.id,
            },
          },
        });
        if (sepayEventId !== null) {
          await tx.sePayReceipt.create({ data: { eventId: sepayEventId, paymentId } });
        }
        await tx.notification.create({
          data: {
            userId: current.userId,
            title: "Gói VIP đã được kích hoạt",
            message: `Giao dịch ${current.reference} đã được duyệt. Gói ${current.plan.name} có hiệu lực đến ${endsAt.toISOString().slice(0, 10)}.`,
            href: "/vip",
          },
        });
        return { payment, activated: true, subscriptionId: subscription.id };
      }, { isolationLevel: "Serializable", maxWait: 10000, timeout: 20000 });
    } catch (error) {
      if (error?.code === "P2034" && attempt < 3) continue;
      if (sepayEventId !== null && error?.code === "P2002") {
        // A concurrent event may have been committed first. Do not retry
        // activation under another payment; the unique receipt is authoritative.
        throw new PaymentTransitionError(409, "SePay event or payment was already reconciled");
      }
      throw error;
    }
  }
  throw new Error("Payment confirmation failed after transaction retries");
}

module.exports = { transitionManualPayment, extendUtcMonths, PaymentTransitionError };
