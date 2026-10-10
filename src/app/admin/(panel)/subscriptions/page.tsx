import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminSubscriptionsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Gói Pro</h1>
      <p className="mt-3 text-sm text-ink/65">Dùng để kích hoạt thủ công sau khi học sinh tạo payment mock.</p>
      <div className="mt-8">
        <AdminResourceManager
          resource="subscriptions"
          defaultPayload={{
            userId: "copy-user-id",
            planId: "copy-plan-id",
            status: "ACTIVE",
            startsAt: "2026-06-13T00:00:00.000Z",
            endsAt: "2026-07-13T00:00:00.000Z",
          }}
        />
      </div>
    </main>
  );
}
