import { prisma } from "@/lib/db";

export async function createManualCheckout(userId: string, planId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const reference = `EDUVA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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
