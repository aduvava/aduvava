import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { randomBytes } from "node:crypto";

export async function createManualCheckout(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new HttpError(404, "Subscription plan is not available");

  const bank = { name: process.env.PAYMENT_BANK_NAME?.trim(), accountNumber: process.env.PAYMENT_BANK_ACCOUNT_NUMBER?.trim(), accountHolder: process.env.PAYMENT_BANK_ACCOUNT_HOLDER?.trim() };
  if (!bank.name || !bank.accountNumber || !bank.accountHolder) throw new HttpError(503, "Thanh toán chuyển khoản chưa được cấu hình. Vui lòng liên hệ quản trị viên.");

  // Reuse an existing pending order when reopening checkout; double clicks do not create new charges.
  const existing = await prisma.payment.findFirst({ where: { userId, planId, amount: plan.price, status: "PENDING", provider: "manual-bank-transfer" }, orderBy: { createdAt: "desc" } });
  const reference = `EDUVA${randomBytes(12).toString("hex").toUpperCase()}`;
  const payment = existing ?? await prisma.payment.create({
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

  return { payment: { id: payment.id, amount: payment.amount, status: payment.status, reference: payment.reference }, manualTransferCode: payment.reference, bank, automaticConfirmation: Boolean(process.env.SEPAY_WEBHOOK_API_KEY && process.env.SEPAY_WEBHOOK_API_KEY.length >= 32) };
}
