import { PlanManager } from "@/components/admin/plan-manager";

export default function AdminPlansPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">VIP Educhi</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Gói thành viên</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">Tạo và chỉnh sửa các gói VIP, giá bán, thời hạn và quyền lợi. Gói được mở bán sẽ hiển thị ngay trên trang VIP.</p>
      </div>
      <PlanManager />
    </main>
  );
}
