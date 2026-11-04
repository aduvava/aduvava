import { PlanManager } from "@/components/admin/plan-manager";
import { ensureDefaultVipPlans } from "@/lib/default-vip-plans";
export default async function AdminPlansPage() {
  await ensureDefaultVipPlans();
  return <main className="mx-auto max-w-7xl px-4 py-10 md:px-6"><h1 className="text-3xl font-black">Gói thành viên</h1><p className="my-5 text-sm text-slate-600">Bật gói để hiển thị trên trang VIP và cho phép đặt mua.</p><PlanManager /></main>;
}
