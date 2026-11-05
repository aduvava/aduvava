import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { randomBytes } from "node:crypto";
import { configuredReceivingBank, makeBankTransferDetails } from "@/lib/bank-transfer-details";

export async function createManualCheckout(
  userId: string,
  planId: string,
  beforeCreate?: () => Promise<void>,
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new HttpError(404, "Subscription plan is not available");

  const bank = configuredReceivingBank(process.env);
  if (!bank) {
    throw new HttpError(503, "Thông tin tài khoản nhận tiền chưa được cấu hình. Vui lòng liên hệ hỗ trợ.");
  }
  if (!Number.isSafeInteger(plan.price) || plan.price <= 0) {
    throw new HttpError(503, "Giá gói thành viên chưa hợp lệ.");
  }

  // A retry/reopened payment screen should not create a new invoice or
  // consume the new-checkout quota. Reuse only this authenticated user's
  // latest unpaid, same-price invoice from the last 24 hours.
  const recentPending = await prisma.payment.findFirst({
    where: {
      userId, planId, amount: plan.price, status: "PENDING",
      provider: "manual-bank-transfer",
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentPending && /^EDUVA-[A-F0-9]{24}$/.test(recentPending.reference)) {
    return {
      payment: recentPending,
      manualTransferCode: recentPending.reference,
      bankTransfer: makeBankTransferDetails(bank, recentPending.amount, recentPending.reference),
      reusedPending: true,
    };
  }

  // Apply abuse quota only to genuinely new invoices, after validation.
  if (beforeCreate) await beforeCreate();
  const reference = `EDUVA-${randomBytes(12).toString("hex").toUpperCase()}`;
  const payment = await prisma.payment.create({
    data: {
      userId,
      planId,
      amount: plan.price,
      reference,
      status: "PENDING",
      provider: "manual-bank-transfer",
      metadata: { note: "Pending bank transfer verification" },
    },
  });

  return { payment, manualTransferCode: reference,
    bankTransfer: makeBankTransferDetails(bank, payment.amount, reference) };
}
