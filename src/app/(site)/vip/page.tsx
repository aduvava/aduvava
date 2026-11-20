import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VipPricing } from "@/components/vip-pricing";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReferralOverview } from "@/lib/referrals";

export const metadata: Metadata = {
  title: "Nạp VIP | Educhi",
  description: "Chọn gói VIP Educhi 1, 3 hoặc 6 tháng để mở khóa đề thi và lý thuyết nâng cao.",
};

function featureList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

export default async function VipPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student&callbackUrl=/vip");

  const [plans, activeSubscription, referralOverview] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ price: "asc" }, { createdAt: "asc" }],
    }),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE", endsAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { endsAt: "desc" },
    }),
    getReferralOverview(user.id),
  ]);

  return (
    <VipPricing
      referralOverview={referralOverview}
      initialReferralCode={params.ref ?? ""}
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
