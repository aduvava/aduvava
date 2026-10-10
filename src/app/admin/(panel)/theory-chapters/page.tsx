import { AdminResourceManager } from "@/components/admin/admin-resource-manager";

export default function AdminTheoryChaptersPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-16 md:px-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">Lý thuyết</p>
        <h1 className="text-3xl font-black text-slate-900">Chương lý thuyết</h1>
        <p className="mt-2 text-sm text-slate-500">Tạo chương theo môn, cấp học và lớp để học sinh mở trong tab Lý thuyết.</p>
      </div>
      <AdminResourceManager
        resource="theory-chapters"
        defaultPayload={{
          subjectId: "copy-subject-id",
          educationLevel: "THCS",
          grade: "Lớp 6",
          slug: "ham-so-va-ung-dung-dao-ham",
          title: "Hàm số và ứng dụng đạo hàm",
          description: "Các kiến thức nền tảng cần nắm trước khi làm bài.",
          position: 1,
          isPublished: true,
        }}
      />
    </main>
  );
}
