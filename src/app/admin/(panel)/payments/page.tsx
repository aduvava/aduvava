import { PaymentManager } from "@/components/admin/payment-manager";

export default function AdminPaymentsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:py-12">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Đối soát ngân hàng</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Thanh toán VIP</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">Xem mã chuyển khoản, học viên, gói và số tiền; xác nhận đã nhận tiền để kích hoạt VIP. Không cần nhập JSON.</p>
      </div>
      <PaymentManager />
    </main>
  );
}
