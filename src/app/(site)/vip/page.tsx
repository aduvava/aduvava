import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VipPricing } from "@/components/vip-pricing";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Nạp VIP | Ava",
  description: "Đăng ký VIP Ava để mở khóa đề thi, lý thuyết và AI chấm bài.",
};

function featureList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export default async function VipPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student&callbackUrl=/vip");

  const [plans, activeSubscription] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    }),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", endsAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { endsAt: "desc" },
    }),
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
    />
  );
}
