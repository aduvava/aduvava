import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminPaymentsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Thanh toán</h1>
      <p className="mt-3 text-sm text-ink/65">Theo dõi yêu cầu chuyển khoản và cập nhật trạng thái sau khi đối soát.</p>
      <div className="mt-8">
        <AdminResourceManager
          resource="payments"
          defaultPayload={{ userId: "", planId: "", amount: 0, status: "PENDING", provider: "manual-bank-transfer", reference: "" }}
        />
      </div>
    </main>
  );
}
