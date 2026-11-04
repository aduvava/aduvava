import type { Metadata } from "next";
import { VipPricing } from "@/components/vip-pricing";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultVipPlans } from "@/lib/default-vip-plans";

export const metadata: Metadata = {
  title: "Nạp VIP | Ava",
  description: "Đăng ký VIP Ava để mở khóa đề thi, lý thuyết và AI chấm bài.",
};

function featureList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export default async function VipPage() {
  const user = await getCurrentUser();

  await ensureDefaultVipPlans();
  const [plans, activeSubscription, pendingPayments] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    }),
    user ? prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", endsAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { endsAt: "desc" },
    }) : Promise.resolve(null),
    user ? prisma.payment.findMany({
      where: { userId: user.id, status: "PENDING", provider: "manual-bank-transfer" },
      include: { plan: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10,
    }) : Promise.resolve([]),
  ]);

  return (
    <VipPricing
      plans={plans.map((plan) => ({
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        interval: plan.interval,
        features: featureList(plan.features),
      }))}
      activeSubscription={activeSubscription ? {
        planName: activeSubscription.plan.name,
        endsAt: activeSubscription.endsAt.toISOString(),
      } : null}
      pendingPayments={pendingPayments.map((payment) => ({ id: payment.id, planName: payment.plan.name, amount: payment.amount, reference: payment.reference }))}
      bank={process.env.PAYMENT_BANK_NAME && process.env.PAYMENT_BANK_ACCOUNT_NUMBER && process.env.PAYMENT_BANK_ACCOUNT_HOLDER ? {
        name: process.env.PAYMENT_BANK_NAME, accountNumber: process.env.PAYMENT_BANK_ACCOUNT_NUMBER, accountHolder: process.env.PAYMENT_BANK_ACCOUNT_HOLDER,
      } : null}
    />
  );
}
