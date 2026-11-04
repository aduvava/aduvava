import { PaymentManager } from "@/components/admin/payment-manager";
export default function AdminPaymentsPage() {
  return <main className="mx-auto max-w-7xl px-4 py-10 md:px-6"><h1 className="text-3xl font-black">Thanh toán</h1><p className="my-5 text-sm text-slate-600">Giao dịch do người dùng tạo từ trang VIP. Quản trị viên chỉ cập nhật trạng thái sau khi kiểm tra sao kê.</p><PaymentManager /></main>;
}
