import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { randomBytes } from "node:crypto";
import { configuredReceivingBank, makeBankTransferDetails } from "@/lib/bank-transfer-details";

export async function createManualCheckout(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new HttpError(404, "Subscription plan is not available");

  const bank = configuredReceivingBank(process.env);
  if (!bank) {
    throw new HttpError(503, "Thông tin tài khoản nhận tiền chưa được cấu hình. Vui lòng liên hệ hỗ trợ.");
  }
  if (!Number.isSafeInteger(plan.price) || plan.price <= 0) {
    throw new HttpError(503, "Giá gói thành viên chưa hợp lệ.");
  }

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
