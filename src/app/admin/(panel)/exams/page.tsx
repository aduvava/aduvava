import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminExamsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 md:px-6">
      <h1 className="font-display text-4xl font-black text-ink">Admin · Đề thi</h1>
      <div className="mt-8">
        <AdminResourceManager
          resource="exams"
          defaultPayload={{
            code: "",
            slug: "",
            title: "",
            description: "",
            family: "THPTQG",
            type: "MOCK",
            accessLevel: "FREE",
            year: new Date().getFullYear(),
            durationMinutes: 45,
            targetScore: 8,
            subjectId: "",
            isPublished: true,
          }}
        />
      </div>
    </main>
  );
}
