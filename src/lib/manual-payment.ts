import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { randomBytes } from "node:crypto";
import { REFERRAL_CODE_PATTERN } from "@/lib/referral-invites";
import { configuredReceivingBank, makeBankTransferDetails } from "@/lib/bank-transfer-details";

export async function createManualCheckout(
  userId: string,
  planId: string,
  beforeCreate?: () => Promise<void>,
  submittedReferralCode?: string,
) {
  // This is optional for every account, including returning and VIP members.
  // Validate on the server and attach only to a still-unpaid bank invoice.
  const referralCode = submittedReferralCode?.trim().toUpperCase() ?? "";
  if (referralCode && !REFERRAL_CODE_PATTERN.test(referralCode)) {
    throw new HttpError(400, "Mã giới thiệu phải gồm đúng 6 chữ cái hoặc chữ số.");
  }
  const referrer = referralCode ? await prisma.user.findUnique({
    where: { referralCode }, select: { id: true },
  }) : null;
  if (referralCode && !referrer) throw new HttpError(400, "Mã giới thiệu không tồn tại.");
  if (referrer?.id === userId) throw new HttpError(400, "Bạn không thể sử dụng mã giới thiệu của chính mình.");

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
    const existingMetadata = recentPending.metadata && typeof recentPending.metadata === "object" &&
      !Array.isArray(recentPending.metadata)
      ? recentPending.metadata as Record<string, unknown> : {};
    const appliedId = typeof existingMetadata.referralInviterId === "string"
      ? existingMetadata.referralInviterId : null;
    const existingCode = typeof existingMetadata.referralCodeApplied === "string"
      ? existingMetadata.referralCodeApplied : "";
    if (referrer && appliedId && appliedId !== referrer.id) {
      throw new HttpError(409, "Bạn có đơn VIP chờ thanh toán với mã giới thiệu khác. Vui lòng hoàn tất đơn cũ hoặc liên hệ hỗ trợ.");
    }
    let payment = recentPending;
    if (referrer && !appliedId) {
      // May only add a code while PENDING; never alter a settled payment.
      // A concurrent SePay confirmation must not be credited retroactively.
      const nextMetadata = {
        ...existingMetadata, referralInviterId: referrer.id, referralCodeApplied: referralCode,
      };
      const updated = await prisma.payment.updateMany({
        where: { id: recentPending.id, status: "PENDING" },
        data: { metadata: nextMetadata },
      });
      if (updated.count !== 1) throw new HttpError(409, "Giao dịch đã đổi trạng thái, vui lòng tải lại trang VIP.");
      payment = await prisma.payment.findUniqueOrThrow({ where: { id: recentPending.id } });
    }
    return {
      payment,
      appliedReferralCode: referrer ? referralCode : existingCode,
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
      metadata: {
        note: "Pending bank transfer verification",
        ...(referrer ? { referralInviterId: referrer.id, referralCodeApplied: referralCode } : {}),
      },
    },
  });

  return { payment, appliedReferralCode: referralCode, manualTransferCode: reference,
    bankTransfer: makeBankTransferDetails(bank, payment.amount, reference) };
}
