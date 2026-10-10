import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminPaymentsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Thanh toán mock</h1>
      <p className="mt-3 text-sm text-ink/65">Theo dõi yêu cầu thanh toán mock và cập nhật trạng thái nếu cần.</p>
      <div className="mt-8">
        <AdminResourceManager
          resource="payments"
          defaultPayload={{ userId: "copy-user-id", planId: "copy-plan-id", amount: 99000, status: "PENDING", provider: "mock", reference: "MOCK-MANUAL-001" }}
        />
      </div>
    </main>
  );
}
