import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminSubscriptionsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Gói Pro</h1>
      <p className="mt-3 text-sm text-ink/65">Kích hoạt gói sau khi giao dịch của học sinh đã được đối soát.</p>
      <div className="mt-8">
        <AdminResourceManager
          resource="subscriptions"
          defaultPayload={{
            userId: "",
            planId: "",
            status: "ACTIVE",
            startsAt: "",
            endsAt: "",
          }}
        />
      </div>
    </main>
  );
}
