import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminSubjectsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Môn học</h1>
      <div className="mt-8">
        <AdminResourceManager
          resource="subjects"
          defaultPayload={{
            slug: "vat-ly",
            name: "Vật lý",
            family: "THPTQG",
            description: "Kho đề Vật lý THPTQG",
            color: "#1f6f5b",
            icon: "atom",
          }}
        />
      </div>
    </main>
  );
}
