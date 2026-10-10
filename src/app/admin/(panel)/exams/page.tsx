import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminExamsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Đề thi</h1>
      <div className="mt-8">
        <AdminResourceManager
          resource="exams"
          defaultPayload={{
            code: "PHY-2026-FREE-01",
            slug: "vat-ly-mini-test-2026",
            title: "Vật lý Mini Test 2026",
            description: "Đề demo",
            family: "THPTQG",
            type: "MOCK",
            accessLevel: "FREE",
            year: 2026,
            durationMinutes: 45,
            targetScore: 8,
            subjectId: "copy-subject-id",
            isPublished: true,
          }}
        />
      </div>
    </main>
  );
}
