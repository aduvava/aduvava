import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { randomBytes } from "node:crypto";

export async function createManualCheckout(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.isActive) throw new HttpError(404, "Subscription plan is not available");

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

  return { payment, manualTransferCode: reference };
}
