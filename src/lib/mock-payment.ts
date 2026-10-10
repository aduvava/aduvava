import { prisma } from "@/lib/db";

export async function createMockCheckout(userId: string, planId: string, paymentMethod = "QR") {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");

  const reference = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const payment = await prisma.payment.create({
    data: {
      userId,
      planId,
      amount: plan.price,
      reference,
      status: "PENDING",
      provider: "mock",
      checkoutUrl: `${process.env.MOCK_PAYMENT_BASE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/vip?payment=${reference}`,
      metadata: { note: "Manual activation required by admin", paymentMethod }
    }
  });

  return {
    payment,
    manualTransferCode: reference,
    checkoutUrl: payment.checkoutUrl
  };
}
