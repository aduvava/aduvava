import { prisma } from "@/lib/db";

// Initial catalog only: editing an existing plan in Admin never resets its price or benefits.
import plans from "@/data/default-vip-plans.json";
export const defaultVipPlans = plans;

export async function ensureDefaultVipPlans() {
  // Populate a fresh production database. The catalog is subsequently owned by Admin.
  if (await prisma.plan.count() !== 0) return;
  await prisma.plan.createMany({ data: defaultVipPlans.map((plan) => ({ ...plan, interval: plan.interval as "MONTH" | "QUARTER" | "YEAR", isActive: true })), skipDuplicates: true });
}
